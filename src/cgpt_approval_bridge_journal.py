#!/usr/bin/env python3
"""Journal append-only du cgpt-approval-bridge.

Le journal est distinct du magasin d'etat approvals.json.

Objectifs :

  - conserver l'historique chronologique du broker ;
  - ne jamais reecrire un evenement existant ;
  - rendre chaque evenement durable ;
  - permettre l'audit d'une approbation ;
  - supporter des evenements uniques et repetables ;
  - fournir une idempotence explicite via event_key ;
  - permettre une reconstruction ulterieure de l'etat ;
  - detecter toute alteration retroactive par chainage SHA-256 ;
  - rester utilisable entre plusieurs processus.

Format :

  Un evenement JSON par ligne au format NDJSON.

Exemple :

  {
    "journal_version": 3,
    "sequence": 42,
    "event_id": "evt-...",
    "event_key": "decision:apr-123:dec-456",
    "event_type": "APPROVAL_APPROVED",
    "timestamp": "2026-09-10T21:00:00Z",
    "approval_id": "apr-...",
    "requestId": "req-...",
    "change_id": "example-change",
    "actor": "CGPT",
    "data": {...}
  }

event_id :

  Identifiant unique genere pour chaque evenement effectivement ajoute.

event_key :

  Cle d'idempotence optionnelle fournie par l'appelant.

  Deux appels append_event() utilisant le meme event_key retournent
  l'evenement deja present au lieu d'ajouter une nouvelle ligne.

  Cela permet :

    APPROVAL_CREATED
      unique pour une approbation.

    CONTROLLER_NOTIFICATION_ATTEMPTED
      repetable entre plusieurs tentatives.

    Mais :
      le retry d'une meme tentative peut conserver le meme event_key
      et ne produit alors aucun doublon.

Durabilite :

  flock
  seek fin
  write
  flush
  fsync

Le journal est append-only.
Aucun evenement existant n'est modifie.
Les evenements v3 sont lies par previous_hash/event_hash (SHA-256).
Un checkpoint HMAC-SHA256 separe peut authentifier la tete du journal.
"""

import fcntl
import hashlib
import hmac
import json
import os
import threading
import uuid

from contextlib import contextmanager
from datetime import datetime, timezone


JOURNAL_VERSION = 3
CHECKPOINT_VERSION = 2

_JOURNAL_STATE_BASE = os.path.expandvars("$HOME/.opencode/state")

DEFAULT_JOURNAL_PATH = (
    _JOURNAL_STATE_BASE
    + "/cgpt-approval-bridge/events.ndjson"
)

DEFAULT_CHECKPOINT_PATH = (
    _JOURNAL_STATE_BASE
    + "/cgpt-approval-bridge/journal.checkpoint.json"
)

CHECKPOINT_KEY_ENV = "CGPT_JOURNAL_HMAC_KEY"
CHECKPOINT_KEY_ID_ENV = "CGPT_JOURNAL_HMAC_KEY_ID"
CHECKPOINT_PREVIOUS_KEYS_ENV = "CGPT_JOURNAL_HMAC_PREVIOUS_KEYS"
CHECKPOINT_PATH_ENV = "CGPT_JOURNAL_CHECKPOINT_PATH"

MAX_EVENT_TYPE_LENGTH = 100
MAX_EVENT_KEY_LENGTH = 300
MAX_IDENTIFIER_LENGTH = 200
MAX_ACTOR_LENGTH = 100
SHA256_HEX_LENGTH = 64
ZERO_HASH = "0" * SHA256_HEX_LENGTH

THREAD_JOURNAL_LOCK = threading.RLock()


class JournalError(Exception):
    """Erreur explicite du journal."""


class JournalValidationError(Exception):
    """Evenement refuse avant ecriture."""


def utc_now():
    """Retourne l'heure UTC au format RFC3339."""
    return (
        datetime.now(
            timezone.utc
        )
        .isoformat()
        .replace(
            "+00:00",
            "Z",
        )
    )


def journal_path():
    """Retourne le chemin du journal."""
    return os.environ.get(
        "CGPT_APPROVAL_JOURNAL",
        DEFAULT_JOURNAL_PATH,
    )


def journal_lock_path(path):
    """Retourne le chemin du verrou inter-processus."""
    return path + ".lock"


def ensure_parent(path):
    """Cree le repertoire parent si necessaire."""
    parent = os.path.dirname(
        path
    )

    if not parent:
        return

    try:
        os.makedirs(
            parent,
            exist_ok=True,
        )

    except OSError as exc:
        raise JournalError(
            "creation repertoire journal impossible: %s"
            % exc
        ) from exc


@contextmanager
def locked_journal(path):
    """Pose un verrou entre threads et processus."""
    ensure_parent(
        path
    )

    lock_path = journal_lock_path(
        path
    )

    with THREAD_JOURNAL_LOCK:
        try:
            lock_handle = open(
                lock_path,
                "a+",
                encoding="utf-8",
            )

        except OSError as exc:
            raise JournalError(
                "ouverture verrou journal impossible: %s"
                % exc
            ) from exc

        try:
            try:
                fcntl.flock(
                    lock_handle.fileno(),
                    fcntl.LOCK_EX,
                )

            except OSError as exc:
                raise JournalError(
                    "verrouillage journal impossible: %s"
                    % exc
                ) from exc

            yield

        finally:
            try:
                fcntl.flock(
                    lock_handle.fileno(),
                    fcntl.LOCK_UN,
                )

            except OSError:
                pass

            lock_handle.close()


def new_event_id():
    """Genere un identifiant unique d'evenement."""
    return (
        "evt-"
        + uuid.uuid4().hex
    )


def canonical_event_bytes(event, include_event_hash=False):
    """Serialise deterministement un evenement pour le chainage."""
    payload = dict(event)

    if not include_event_hash:
        payload.pop(
            "event_hash",
            None,
        )

    return json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(
            ",",
            ":",
        ),
    ).encode(
        "utf-8"
    )


def sha256_hex(payload):
    """Retourne l'empreinte SHA-256 hexadecimale."""
    return hashlib.sha256(
        payload
    ).hexdigest()


def checkpoint_path():
    """Retourne le chemin du checkpoint authentifie."""
    return os.environ.get(
        CHECKPOINT_PATH_ENV,
        DEFAULT_CHECKPOINT_PATH,
    )


def checkpoint_key():
    """Retourne la cle HMAC primaire sans jamais l'exposer."""
    value = os.environ.get(
        CHECKPOINT_KEY_ENV,
        "",
    )

    if not value:
        return None

    return value.encode(
        "utf-8"
    )


def checkpoint_key_id():
    """Retourne l'identifiant public de la cle primaire."""
    value = os.environ.get(
        CHECKPOINT_KEY_ID_ENV,
        "primary",
    ).strip()

    if not value:
        value = "primary"

    if len(value) > MAX_IDENTIFIER_LENGTH:
        raise JournalError(
            "identifiant de cle HMAC trop long"
        )

    return value


def previous_checkpoint_keys():
    """Charge les anciennes cles HMAC autorisees en verification.

    Le format attendu dans CGPT_JOURNAL_HMAC_PREVIOUS_KEYS est un objet
    JSON de la forme : {"ancienne-cle":"secret", ...}.
    Les secrets ne sont jamais retournes par les fonctions de statut.
    """
    raw = os.environ.get(
        CHECKPOINT_PREVIOUS_KEYS_ENV,
        "",
    ).strip()

    if not raw:
        return {}

    try:
        payload = json.loads(raw)

    except json.JSONDecodeError as exc:
        raise JournalError(
            "CGPT_JOURNAL_HMAC_PREVIOUS_KEYS invalide: JSON attendu"
        ) from exc

    if not isinstance(payload, dict):
        raise JournalError(
            "CGPT_JOURNAL_HMAC_PREVIOUS_KEYS doit etre un objet JSON"
        )

    result = {}

    for key_id, secret in payload.items():
        if (
            not isinstance(key_id, str)
            or not key_id.strip()
            or len(key_id.strip()) > MAX_IDENTIFIER_LENGTH
        ):
            raise JournalError(
                "identifiant d'ancienne cle HMAC invalide"
            )

        if (
            not isinstance(secret, str)
            or not secret
        ):
            raise JournalError(
                "ancienne cle HMAC '%s' invalide"
                % key_id
            )

        result[key_id.strip()] = secret.encode(
            "utf-8"
        )

    return result


def checkpoint_keyring():
    """Retourne les cles de verification indexees par key_id."""
    keys = previous_checkpoint_keys()
    primary = checkpoint_key()

    if primary is not None:
        primary_id = checkpoint_key_id()

        if primary_id in keys:
            raise JournalError(
                "key_id primaire egal a une ancienne cle"
            )

        keys[primary_id] = primary

    return keys


def checkpoint_enabled():
    """Indique si une cle HMAC primaire est configuree."""
    return checkpoint_key() is not None


def checkpoint_key_status():
    """Expose uniquement les metadonnees non secretes des cles."""
    primary = checkpoint_key()
    previous = previous_checkpoint_keys()

    return {
        "enabled": primary is not None,
        "primary_key_id": (
            checkpoint_key_id()
            if primary is not None
            else ""
        ),
        "previous_key_ids": sorted(
            previous.keys()
        ),
        "previous_key_count": len(previous),
        "secrets_exposed": False,
    }


def canonical_checkpoint_bytes(payload):
    """Serialise deterministement un checkpoint sans sa signature."""
    material = dict(
        payload
    )

    material.pop(
        "signature",
        None,
    )

    return json.dumps(
        material,
        ensure_ascii=False,
        sort_keys=True,
        separators=(
            ",",
            ":",
        ),
    ).encode(
        "utf-8"
    )


def checkpoint_signature(payload, key):
    """Calcule la signature HMAC-SHA256 d'un checkpoint."""
    return hmac.new(
        key,
        canonical_checkpoint_bytes(
            payload
        ),
        hashlib.sha256,
    ).hexdigest()


def fsync_parent_directory(path):
    """Synchronise le repertoire contenant path."""
    directory = os.path.dirname(
        path
    ) or "."

    flags = os.O_RDONLY

    if hasattr(
        os,
        "O_DIRECTORY",
    ):
        flags |= os.O_DIRECTORY

    try:
        fd = os.open(
            directory,
            flags,
        )

    except OSError as exc:
        raise JournalError(
            "ouverture repertoire checkpoint impossible: %s"
            % exc
        ) from exc

    try:
        os.fsync(
            fd
        )

    except OSError as exc:
        raise JournalError(
            "fsync repertoire checkpoint impossible: %s"
            % exc
        ) from exc

    finally:
        os.close(
            fd
        )


def build_checkpoint(sequence, chain_tip, path):
    """Construit et signe le checkpoint avec la cle primaire."""
    key = checkpoint_key()

    if key is None:
        return None

    key_id = checkpoint_key_id()

    payload = {
        "checkpoint_version": CHECKPOINT_VERSION,
        "algorithm": "hmac-sha256",
        "key_id": key_id,
        "journal_path": path,
        "sequence": sequence,
        "chain_tip": chain_tip,
        "updated_at": utc_now(),
    }

    payload[
        "signature"
    ] = checkpoint_signature(
        payload,
        key,
    )

    return payload


def write_checkpoint_unlocked(sequence, chain_tip, journal_file_path):
    """Ecrit atomiquement le checkpoint HMAC courant.

    Le verrou du journal doit deja etre detenu.
    """
    payload = build_checkpoint(
        sequence,
        chain_tip,
        journal_file_path,
    )

    if payload is None:
        return None

    path = checkpoint_path()

    ensure_parent(
        path
    )

    tmp_path = (
        path
        + ".tmp."
        + str(os.getpid())
        + "."
        + str(threading.get_ident())
    )

    replaced = False

    try:
        with open(
            tmp_path,
            "w",
            encoding="utf-8",
        ) as handle:
            json.dump(
                payload,
                handle,
                ensure_ascii=False,
                sort_keys=True,
                separators=(
                    ",",
                    ":",
                ),
            )

            handle.write(
                "\n"
            )

            handle.flush()
            os.fsync(
                handle.fileno()
            )

        os.replace(
            tmp_path,
            path,
        )

        replaced = True

        fsync_parent_directory(
            path
        )

    except OSError as exc:
        raise JournalError(
            "ecriture checkpoint impossible: %s"
            % exc
        ) from exc

    finally:
        if not replaced:
            try:
                if os.path.exists(
                    tmp_path
                ):
                    os.remove(
                        tmp_path
                    )

            except OSError:
                pass

    return payload


def load_checkpoint():
    """Lit le checkpoint separe s'il existe."""
    path = checkpoint_path()

    try:
        with open(
            path,
            "r",
            encoding="utf-8",
        ) as handle:
            payload = json.load(
                handle
            )

    except FileNotFoundError:
        return None

    except (
        OSError,
        json.JSONDecodeError,
    ) as exc:
        raise JournalError(
            "checkpoint illisible: %s"
            % exc
        ) from exc

    if not isinstance(
        payload,
        dict,
    ):
        raise JournalError(
            "checkpoint invalide: objet JSON attendu"
        )

    return payload


def _checkpoint_result(
    ok,
    status,
    *,
    key_id="",
    signer="",
    sequence=None,
    lag_events=None,
    updated_at="",
    rotation_required=False,
    error="",
):
    return {
        "ok": ok,
        "enabled": checkpoint_enabled(),
        "status": status,
        "algorithm": "hmac-sha256",
        "path": checkpoint_path(),
        "key_id": key_id,
        "signer": signer,
        "primary_key_id": (
            checkpoint_key_id()
            if checkpoint_enabled()
            else ""
        ),
        "rotation_required": rotation_required,
        "anchored_sequence": sequence,
        "lag_events": lag_events,
        "updated_at": updated_at,
        "error": error,
    }


def _verify_checkpoint_signature(payload):
    """Retourne (ok, key_id, signer) sans exposer la cle."""
    signature = payload.get(
        "signature",
        "",
    )

    if not isinstance(signature, str):
        signature = ""

    version = payload.get(
        "checkpoint_version"
    )

    primary = checkpoint_key()
    primary_id = (
        checkpoint_key_id()
        if primary is not None
        else ""
    )

    previous = previous_checkpoint_keys()

    if version == 1:
        candidates = []

        if primary is not None:
            candidates.append(
                (
                    primary_id,
                    primary,
                    "PRIMARY",
                )
            )

        candidates.extend(
            (
                key_id,
                key,
                "PREVIOUS",
            )
            for key_id, key in previous.items()
        )

        for key_id, key, signer in candidates:
            expected = checkpoint_signature(
                payload,
                key,
            )

            if hmac.compare_digest(
                signature,
                expected,
            ):
                return (
                    True,
                    key_id,
                    signer,
                )

        return (
            False,
            "",
            "",
        )

    if version != CHECKPOINT_VERSION:
        return (
            False,
            "",
            "",
        )

    key_id = payload.get(
        "key_id",
        "",
    )

    if (
        not isinstance(key_id, str)
        or not key_id
    ):
        return (
            False,
            "",
            "",
        )

    keyring = checkpoint_keyring()
    key = keyring.get(
        key_id
    )

    if key is None:
        return (
            False,
            key_id,
            "UNKNOWN",
        )

    expected = checkpoint_signature(
        payload,
        key,
    )

    if not hmac.compare_digest(
        signature,
        expected,
    ):
        return (
            False,
            key_id,
            "INVALID",
        )

    signer = (
        "PRIMARY"
        if key_id == primary_id
        else "PREVIOUS"
    )

    return (
        True,
        key_id,
        signer,
    )


def verify_checkpoint(events, journal_file_path):
    """Verifie l'ancre HMAC avec la cle primaire ou une ancienne cle."""
    primary = checkpoint_key()
    previous = previous_checkpoint_keys()

    if primary is None and not previous:
        return {
            "ok": True,
            "enabled": False,
            "status": "UNCONFIGURED",
            "algorithm": "hmac-sha256",
            "path": checkpoint_path(),
            "key_id": "",
            "signer": "",
            "primary_key_id": "",
            "rotation_required": False,
            "anchored_sequence": None,
            "lag_events": None,
            "updated_at": "",
            "error": "",
        }

    try:
        payload = load_checkpoint()

    except JournalError as exc:
        return _checkpoint_result(
            False,
            "INVALID",
            error=str(exc),
        )

    if payload is None:
        if not events:
            return _checkpoint_result(
                True,
                "EMPTY",
                sequence=0,
                lag_events=0,
            )

        return _checkpoint_result(
            False,
            "MISSING",
            lag_events=len(events),
            error="checkpoint authentifie absent",
        )

    version = payload.get(
        "checkpoint_version"
    )

    if version not in (
        1,
        CHECKPOINT_VERSION,
    ):
        return _checkpoint_result(
            False,
            "INVALID_VERSION",
            sequence=payload.get("sequence"),
            error="checkpoint_version invalide",
        )

    if payload.get(
        "algorithm"
    ) != "hmac-sha256":
        return _checkpoint_result(
            False,
            "INVALID_ALGORITHM",
            sequence=payload.get("sequence"),
            error="algorithme checkpoint invalide",
        )

    signature_ok, key_id, signer = (
        _verify_checkpoint_signature(
            payload
        )
    )

    if not signature_ok:
        return _checkpoint_result(
            False,
            "INVALID_SIGNATURE",
            key_id=key_id,
            signer=signer,
            sequence=payload.get("sequence"),
            error="signature HMAC checkpoint invalide ou cle indisponible",
        )

    if payload.get(
        "journal_path"
    ) != journal_file_path:
        return _checkpoint_result(
            False,
            "INVALID_BINDING",
            key_id=key_id,
            signer=signer,
            sequence=payload.get("sequence"),
            error="checkpoint lie a un autre journal",
        )

    sequence = payload.get(
        "sequence"
    )

    if (
        not isinstance(sequence, int)
        or isinstance(sequence, bool)
        or sequence < 0
        or sequence > len(events)
    ):
        return _checkpoint_result(
            False,
            "INVALID_SEQUENCE",
            key_id=key_id,
            signer=signer,
            sequence=sequence,
            error="sequence checkpoint invalide",
        )

    try:
        anchored_tip = calculate_chain_tip(
            events[:sequence]
        )

    except JournalError as exc:
        return _checkpoint_result(
            False,
            "INVALID_CHAIN",
            key_id=key_id,
            signer=signer,
            sequence=sequence,
            error=str(exc),
        )

    if payload.get(
        "chain_tip"
    ) != anchored_tip:
        return _checkpoint_result(
            False,
            "ANCHOR_MISMATCH",
            key_id=key_id,
            signer=signer,
            sequence=sequence,
            lag_events=len(events) - sequence,
            error="empreinte journal differente du checkpoint signe",
        )

    lag = len(events) - sequence
    rotation_required = (
        primary is not None
        and (
            signer != "PRIMARY"
            or version != CHECKPOINT_VERSION
        )
    )

    if signer == "PREVIOUS":
        status = (
            "VALID_PREVIOUS_KEY"
            if lag == 0
            else "VALID_PREVIOUS_KEY_LAGGING"
        )

    elif version == 1:
        status = (
            "VALID_LEGACY"
            if lag == 0
            else "VALID_LEGACY_LAGGING"
        )

    else:
        status = (
            "VALID"
            if lag == 0
            else "VALID_LAGGING"
        )

    return _checkpoint_result(
        True,
        status,
        key_id=key_id,
        signer=signer,
        sequence=sequence,
        lag_events=lag,
        updated_at=payload.get(
            "updated_at",
            "",
        ),
        rotation_required=rotation_required,
    )


def rotate_checkpoint():
    """Resigne le checkpoint courant avec la cle primaire.

    La rotation est refusee si le journal ou le checkpoint existant ne sont
    pas deja verifiables. La fonction ne change jamais les secrets : ils
    proviennent exclusivement de l'environnement du processus.
    """
    path = journal_path()

    if checkpoint_key() is None:
        return {
            "ok": False,
            "status": "UNCONFIGURED",
            "primary_key_id": "",
            "rotated": False,
            "error": "cle HMAC primaire non configuree",
        }

    with locked_journal(
        path
    ):
        events = read_events_unlocked(
            path
        )

        chain_tip = calculate_chain_tip(
            events
        )

        current = verify_checkpoint(
            events,
            path,
        )

        if not current.get(
            "ok",
            False,
        ):
            return {
                "ok": False,
                "status": "REFUSED",
                "primary_key_id": checkpoint_key_id(),
                "rotated": False,
                "before": current,
                "error": (
                    "rotation refusee: checkpoint courant non valide"
                ),
            }

        payload = write_checkpoint_unlocked(
            len(events),
            chain_tip,
            path,
        )

        after = verify_checkpoint(
            events,
            path,
        )

    return {
        "ok": bool(after.get("ok")),
        "status": (
            "ROTATED"
            if after.get("ok")
            else "FAILED"
        ),
        "primary_key_id": checkpoint_key_id(),
        "previous_key_id": current.get(
            "key_id",
            "",
        ),
        "rotated": bool(after.get("ok")),
        "sequence": payload.get(
            "sequence",
            0,
        ) if payload else 0,
        "before": current,
        "after": after,
        "error": after.get(
            "error",
            "",
        ),
    }

def legacy_chain_step(previous_hash, event):
    """Integre un evenement v1/v2 dans l'ancre cumulative."""
    material = (
        previous_hash.encode(
            "ascii"
        )
        + b"\n"
        + canonical_event_bytes(
            event
        )
    )

    return sha256_hex(
        material
    )


def calculate_event_hash(event):
    """Calcule event_hash pour un evenement v3."""
    return sha256_hex(
        canonical_event_bytes(
            event
        )
    )


def calculate_chain_tip(events):
    """Calcule et valide la tete cryptographique du journal."""
    tip = ZERO_HASH
    chained = False

    for index, event in enumerate(
        events,
        start=1,
    ):
        version = event.get(
            "journal_version",
            1,
        )

        if version < 3:
            if chained:
                raise JournalError(
                    "evenement legacy apres debut du chainage ligne %d"
                    % index
                )

            tip = legacy_chain_step(
                tip,
                event,
            )
            continue

        chained = True

        previous_hash = event.get(
            "previous_hash",
            "",
        )

        event_hash = event.get(
            "event_hash",
            "",
        )

        if previous_hash != tip:
            raise JournalError(
                "chaine cryptographique rompue ligne %d: previous_hash invalide"
                % index
            )

        expected_hash = calculate_event_hash(
            event
        )

        if event_hash != expected_hash:
            raise JournalError(
                "chaine cryptographique rompue ligne %d: event_hash invalide"
                % index
            )

        tip = event_hash

    return tip


def optional_string(
    value,
    name,
    max_length,
):
    """Valide une chaine optionnelle."""
    if value in (
        None,
        "",
    ):
        return ""

    if not isinstance(
        value,
        str,
    ):
        raise JournalValidationError(
            "%s doit etre une chaine"
            % name
        )

    value = value.strip()

    if len(
        value
    ) > max_length:
        raise JournalValidationError(
            "%s depasse %d caracteres"
            % (
                name,
                max_length,
            )
        )

    return value


def required_string(
    value,
    name,
    max_length,
):
    """Valide une chaine obligatoire."""
    value = optional_string(
        value,
        name,
        max_length,
    )

    if not value:
        raise JournalValidationError(
            "%s est obligatoire"
            % name
        )

    return value


def validate_data(data):
    """Verifie que data est un objet JSON serialisable."""
    if data is None:
        return {}

    if not isinstance(
        data,
        dict,
    ):
        raise JournalValidationError(
            "data doit etre un objet"
        )

    try:
        json.dumps(
            data,
            ensure_ascii=False,
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise JournalValidationError(
            "data n'est pas serialisable en JSON: %s"
            % exc
        ) from exc

    return data


def normalize_legacy_event(event):
    """Normalise en memoire les evenements des versions precedentes.

    Le journal reste append-only : aucune ancienne ligne n'est reecrite.
    """
    version = event.get(
        "journal_version",
        1,
    )

    if version in (
        1,
        2,
    ):
        event.setdefault(
            "event_key",
            "",
        )

        return event

    if version == JOURNAL_VERSION:
        event.setdefault(
            "event_key",
            "",
        )

        return event

    if version > JOURNAL_VERSION:
        raise JournalError(
            "version journal trop recente : %s > %s"
            % (
                version,
                JOURNAL_VERSION,
            )
        )

    raise JournalError(
        "version journal non supportee : %s"
        % version
    )


def parse_journal_line(
    line,
    line_number,
):
    """Parse et valide une ligne existante."""
    try:
        event = json.loads(
            line
        )

    except json.JSONDecodeError as exc:
        raise JournalError(
            "journal corrompu ligne %d: %s"
            % (
                line_number,
                exc,
            )
        ) from exc

    if not isinstance(
        event,
        dict,
    ):
        raise JournalError(
            "journal corrompu ligne %d: objet attendu"
            % line_number
        )

    event = normalize_legacy_event(
        event
    )

    sequence = event.get(
        "sequence"
    )

    if (
        not isinstance(
            sequence,
            int,
        )
        or isinstance(
            sequence,
            bool,
        )
        or sequence < 1
    ):
        raise JournalError(
            "journal corrompu ligne %d: sequence invalide"
            % line_number
        )

    event_id = event.get(
        "event_id"
    )

    if (
        not isinstance(
            event_id,
            str,
        )
        or not event_id
    ):
        raise JournalError(
            "journal corrompu ligne %d: event_id invalide"
            % line_number
        )

    event_type = event.get(
        "event_type"
    )

    if (
        not isinstance(
            event_type,
            str,
        )
        or not event_type
    ):
        raise JournalError(
            "journal corrompu ligne %d: event_type invalide"
            % line_number
        )

    event_key = event.get(
        "event_key",
        "",
    )

    if not isinstance(
        event_key,
        str,
    ):
        raise JournalError(
            "journal corrompu ligne %d: event_key invalide"
            % line_number
        )

    version = event.get(
        "journal_version",
        1,
    )

    if version >= 3:
        previous_hash = event.get(
            "previous_hash"
        )
        event_hash = event.get(
            "event_hash"
        )

        for field, value in (
            ("previous_hash", previous_hash),
            ("event_hash", event_hash),
        ):
            if (
                not isinstance(value, str)
                or len(value) != SHA256_HEX_LENGTH
                or any(
                    char not in "0123456789abcdef"
                    for char in value
                )
            ):
                raise JournalError(
                    "journal corrompu ligne %d: %s invalide"
                    % (
                        line_number,
                        field,
                    )
                )

    return event


def read_events_unlocked(path):
    """Lit tout le journal.

    Le verrou doit deja etre detenu.
    """
    try:
        with open(
            path,
            "r",
            encoding="utf-8",
        ) as handle:
            events = []

            for line_number, line in enumerate(
                handle,
                start=1,
            ):
                line = line.strip()

                if not line:
                    continue

                events.append(
                    parse_journal_line(
                        line,
                        line_number,
                    )
                )

            return events

    except FileNotFoundError:
        return []

    except OSError as exc:
        raise JournalError(
            "lecture journal impossible: %s"
            % exc
        ) from exc


def validate_sequences(events):
    """Verifie la continuite des sequences."""
    expected = 1

    for event in events:
        sequence = event[
            "sequence"
        ]

        if sequence != expected:
            raise JournalError(
                "sequence journal discontinue: "
                "attendu %d, trouve %d"
                % (
                    expected,
                    sequence,
                )
            )

        expected += 1

    return (
        expected - 1
    )


def next_sequence_unlocked(path):
    """Determine la prochaine sequence."""
    events = read_events_unlocked(
        path
    )

    last_sequence = validate_sequences(
        events
    )

    return (
        last_sequence + 1
    )


def find_event_by_key_unlocked(
    events,
    event_key,
):
    """Recherche un evenement par sa cle d'idempotence."""
    if not event_key:
        return None

    found = None

    for event in events:
        if event.get(
            "event_key",
            "",
        ) != event_key:
            continue

        if found is not None:
            raise JournalError(
                "event_key duplique dans le journal: %s"
                % event_key
            )

        found = event

    return found


def build_event(
    sequence,
    event_type,
    previous_hash,
    event_key="",
    approval_id="",
    request_id="",
    change_id="",
    actor="",
    data=None,
):
    """Construit un evenement normalise."""
    event_type = required_string(
        event_type,
        "event_type",
        MAX_EVENT_TYPE_LENGTH,
    )

    event_key = optional_string(
        event_key,
        "event_key",
        MAX_EVENT_KEY_LENGTH,
    )

    approval_id = optional_string(
        approval_id,
        "approval_id",
        MAX_IDENTIFIER_LENGTH,
    )

    request_id = optional_string(
        request_id,
        "requestId",
        MAX_IDENTIFIER_LENGTH,
    )

    change_id = optional_string(
        change_id,
        "change_id",
        MAX_IDENTIFIER_LENGTH,
    )

    actor = optional_string(
        actor,
        "actor",
        MAX_ACTOR_LENGTH,
    )

    data = validate_data(
        data
    )

    previous_hash = required_string(
        previous_hash,
        "previous_hash",
        SHA256_HEX_LENGTH,
    )

    if (
        len(previous_hash) != SHA256_HEX_LENGTH
        or any(
            char not in "0123456789abcdef"
            for char in previous_hash
        )
    ):
        raise JournalValidationError(
            "previous_hash SHA-256 invalide"
        )

    event = {
        "journal_version": JOURNAL_VERSION,
        "sequence": sequence,
        "event_id": new_event_id(),
        "event_key": event_key,
        "event_type": event_type,
        "timestamp": utc_now(),
        "approval_id": approval_id,
        "requestId": request_id,
        "change_id": change_id,
        "actor": actor,
        "data": data,
        "previous_hash": previous_hash,
    }

    event[
        "event_hash"
    ] = calculate_event_hash(
        event
    )

    return event


def validate_idempotent_match(
    existing,
    event_type,
    approval_id,
    request_id,
    change_id,
):
    """Verifie qu'une event_key reutilisee designe le meme evenement."""
    expected = {
        "event_type": event_type,
        "approval_id": approval_id,
        "requestId": request_id,
        "change_id": change_id,
    }

    for field, expected_value in expected.items():
        existing_value = existing.get(
            field,
            "",
        )

        if existing_value != expected_value:
            raise JournalValidationError(
                "event_key deja utilisee avec %s different"
                % field
            )


def append_event(
    event_type,
    event_key="",
    approval_id="",
    request_id="",
    change_id="",
    actor="",
    data=None,
):
    """Ajoute durablement un evenement.

    Sans event_key :
      chaque appel ajoute un nouvel evenement.

    Avec event_key :
      le premier appel ajoute l'evenement ;
      les appels suivants retournent l'evenement existant.

    Une meme event_key ne peut jamais etre reutilisee pour un evenement
    structurellement different.
    """
    event_type = required_string(
        event_type,
        "event_type",
        MAX_EVENT_TYPE_LENGTH,
    )

    event_key = optional_string(
        event_key,
        "event_key",
        MAX_EVENT_KEY_LENGTH,
    )

    approval_id = optional_string(
        approval_id,
        "approval_id",
        MAX_IDENTIFIER_LENGTH,
    )

    request_id = optional_string(
        request_id,
        "requestId",
        MAX_IDENTIFIER_LENGTH,
    )

    change_id = optional_string(
        change_id,
        "change_id",
        MAX_IDENTIFIER_LENGTH,
    )

    actor = optional_string(
        actor,
        "actor",
        MAX_ACTOR_LENGTH,
    )

    data = validate_data(
        data
    )

    path = journal_path()

    ensure_parent(
        path
    )

    with locked_journal(
        path
    ):
        events = read_events_unlocked(
            path
        )

        last_sequence = validate_sequences(
            events
        )

        chain_tip = calculate_chain_tip(
            events
        )

        if event_key:
            existing = find_event_by_key_unlocked(
                events,
                event_key,
            )

            if existing is not None:
                validate_idempotent_match(
                    existing,
                    event_type,
                    approval_id,
                    request_id,
                    change_id,
                )

                if checkpoint_enabled():
                    write_checkpoint_unlocked(
                        last_sequence,
                        chain_tip,
                        path,
                    )

                return existing

        sequence = (
            last_sequence + 1
        )

        event = build_event(
            sequence=sequence,
            event_type=event_type,
            previous_hash=chain_tip,
            event_key=event_key,
            approval_id=approval_id,
            request_id=request_id,
            change_id=change_id,
            actor=actor,
            data=data,
        )

        serialized = (
            json.dumps(
                event,
                ensure_ascii=False,
                separators=(
                    ",",
                    ":",
                ),
            )
            + "\n"
        )

        try:
            with open(
                path,
                "a",
                encoding="utf-8",
            ) as handle:
                handle.write(
                    serialized
                )

                handle.flush()

                os.fsync(
                    handle.fileno()
                )

        except OSError as exc:
            raise JournalError(
                "ecriture journal impossible: %s"
                % exc
            ) from exc

        if checkpoint_enabled():
            try:
                write_checkpoint_unlocked(
                    sequence,
                    event[
                        "event_hash"
                    ],
                    path,
                )

            except JournalError:
                # L'evenement est deja durable. Le checkpoint pourra
                # etre rattrape lors du prochain append ou healthcheck.
                pass

    return event


def append_unique_event(
    event_type,
    event_key,
    approval_id="",
    request_id="",
    change_id="",
    actor="",
    data=None,
):
    """Ajoute explicitement un evenement idempotent."""
    event_key = required_string(
        event_key,
        "event_key",
        MAX_EVENT_KEY_LENGTH,
    )

    return append_event(
        event_type=event_type,
        event_key=event_key,
        approval_id=approval_id,
        request_id=request_id,
        change_id=change_id,
        actor=actor,
        data=data,
    )


def append_repeated_event(
    event_type,
    approval_id="",
    request_id="",
    change_id="",
    actor="",
    data=None,
):
    """Ajoute toujours une nouvelle occurrence."""
    return append_event(
        event_type=event_type,
        event_key="",
        approval_id=approval_id,
        request_id=request_id,
        change_id=change_id,
        actor=actor,
        data=data,
    )


def read_events(
    approval_id="",
    request_id="",
    event_type="",
    event_key="",
    limit=0,
):
    """Lit les evenements avec filtres optionnels."""
    approval_id = optional_string(
        approval_id,
        "approval_id",
        MAX_IDENTIFIER_LENGTH,
    )

    request_id = optional_string(
        request_id,
        "requestId",
        MAX_IDENTIFIER_LENGTH,
    )

    event_type = optional_string(
        event_type,
        "event_type",
        MAX_EVENT_TYPE_LENGTH,
    )

    event_key = optional_string(
        event_key,
        "event_key",
        MAX_EVENT_KEY_LENGTH,
    )

    if (
        not isinstance(
            limit,
            int,
        )
        or isinstance(
            limit,
            bool,
        )
        or limit < 0
    ):
        raise JournalValidationError(
            "limit doit etre un entier positif ou nul"
        )

    path = journal_path()

    with locked_journal(
        path
    ):
        events = read_events_unlocked(
            path
        )

    result = []

    for event in events:
        if (
            approval_id
            and event.get(
                "approval_id"
            )
            != approval_id
        ):
            continue

        if (
            request_id
            and event.get(
                "requestId"
            )
            != request_id
        ):
            continue

        if (
            event_type
            and event.get(
                "event_type"
            )
            != event_type
        ):
            continue

        if (
            event_key
            and event.get(
                "event_key",
                "",
            )
            != event_key
        ):
            continue

        result.append(
            event
        )

    if limit:
        result = result[
            -limit:
        ]

    return result


def get_event_by_key(event_key):
    """Retourne l'evenement portant event_key."""
    event_key = required_string(
        event_key,
        "event_key",
        MAX_EVENT_KEY_LENGTH,
    )

    events = read_events(
        event_key=event_key,
        limit=1,
    )

    if not events:
        return None

    return events[
        0
    ]


def event_key_exists(event_key):
    """Indique si une cle d'idempotence existe."""
    return (
        get_event_by_key(
            event_key
        )
        is not None
    )


def last_event(
    approval_id="",
    request_id="",
    event_type="",
):
    """Retourne le dernier evenement correspondant."""
    events = read_events(
        approval_id=approval_id,
        request_id=request_id,
        event_type=event_type,
        limit=1,
    )

    if not events:
        return None

    return events[
        0
    ]


def approval_history(
    approval_id,
):
    """Retourne l'historique complet d'une approbation."""
    approval_id = required_string(
        approval_id,
        "approval_id",
        MAX_IDENTIFIER_LENGTH,
    )

    return read_events(
        approval_id=approval_id,
    )


def reconstruct_terminal_status(
    approval_id,
):
    """Reconstruit le dernier statut terminal connu."""
    terminal_event_statuses = {
        "APPROVAL_APPROVED": "APPROVED",
        "APPROVAL_REJECTED": "REJECTED",
        "APPROVAL_NEEDS_CLARIFICATION": (
            "NEEDS_CLARIFICATION"
        ),
        "APPROVAL_CANCELLED": "CANCELLED",
        "APPROVAL_EXPIRED": "EXPIRED",
    }

    events = approval_history(
        approval_id
    )

    status = None

    for event in events:
        candidate = terminal_event_statuses.get(
            event.get(
                "event_type"
            )
        )

        if candidate is not None:
            status = candidate

    return status


def verify_journal():
    """Verifie l'integrite structurelle du journal."""
    path = journal_path()

    with locked_journal(
        path
    ):
        events = read_events_unlocked(
            path
        )

    expected_sequence = 1

    try:
        chain_tip = calculate_chain_tip(
            events
        )

    except JournalError as exc:
        return {
            "ok": False,
            "error": str(exc),
        }

    event_ids = set()
    event_keys = set()

    journal_versions = set()

    for event in events:
        sequence = event[
            "sequence"
        ]

        if sequence != expected_sequence:
            return {
                "ok": False,
                "error": (
                    "sequence discontinue: "
                    "attendu %d, trouve %d"
                    % (
                        expected_sequence,
                        sequence,
                    )
                ),
            }

        event_id = event[
            "event_id"
        ]

        if event_id in event_ids:
            return {
                "ok": False,
                "error": (
                    "event_id duplique: %s"
                    % event_id
                ),
            }

        event_ids.add(
            event_id
        )

        event_key = event.get(
            "event_key",
            "",
        )

        if event_key:
            if event_key in event_keys:
                return {
                    "ok": False,
                    "error": (
                        "event_key duplique: %s"
                        % event_key
                    ),
                }

            event_keys.add(
                event_key
            )

        journal_versions.add(
            event.get(
                "journal_version",
                1,
            )
        )

        expected_sequence += 1

    checkpoint = verify_checkpoint(
        events,
        path,
    )

    if not checkpoint.get(
        "ok"
    ):
        return {
            "ok": False,
            "events": len(
                events
            ),
            "last_sequence": (
                expected_sequence - 1
            ),
            "hash_chain": {
                "enabled": True,
                "algorithm": "sha256",
                "tip": chain_tip,
            },
            "authenticated_checkpoint": checkpoint,
            "error": checkpoint.get(
                "error",
                "checkpoint authentifie invalide",
            ),
        }

    return {
        "ok": True,
        "events": len(
            events
        ),
        "last_sequence": (
            expected_sequence - 1
        ),
        "unique_event_ids": len(
            event_ids
        ),
        "idempotent_event_keys": len(
            event_keys
        ),
        "journal_versions": sorted(
            journal_versions
        ),
        "current_journal_version": (
            JOURNAL_VERSION
        ),
        "hash_chain": {
            "enabled": True,
            "algorithm": "sha256",
            "tip": chain_tip,
        },
        "authenticated_checkpoint": checkpoint,
        "error": "",
    }


def journal_stats():
    """Retourne les informations utiles au healthcheck."""
    path = journal_path()

    try:
        with locked_journal(
            path
        ):
            events = read_events_unlocked(
                path
            )

        last_sequence = 0
        last_event_id = ""
        last_event_key = ""
        last_event_type = ""
        last_timestamp = ""

        keyed_events = 0
        repeated_events = 0

        versions = set()

        for event in events:
            versions.add(
                event.get(
                    "journal_version",
                    1,
                )
            )

            if event.get(
                "event_key",
                "",
            ):
                keyed_events += 1

            else:
                repeated_events += 1

        chain_tip = calculate_chain_tip(
            events
        )

        chained_events = sum(
            1
            for event in events
            if event.get(
                "journal_version",
                1,
            ) >= 3
        )

        checkpoint = verify_checkpoint(
            events,
            path,
        )

        if events:
            last = events[
                -1
            ]

            last_sequence = last.get(
                "sequence",
                0,
            )

            last_event_id = last.get(
                "event_id",
                "",
            )

            last_event_key = last.get(
                "event_key",
                "",
            )

            last_event_type = last.get(
                "event_type",
                "",
            )

            last_timestamp = last.get(
                "timestamp",
                "",
            )

        return {
            "ok": checkpoint.get(
                "ok",
                False,
            ),
            "path": path,
            "journal_version": (
                JOURNAL_VERSION
            ),
            "versions_present": sorted(
                versions
            ),
            "events": len(
                events
            ),
            "keyed_events": keyed_events,
            "repeated_events": repeated_events,
            "last_sequence": last_sequence,
            "last_event_id": last_event_id,
            "last_event_key": last_event_key,
            "last_event_type": last_event_type,
            "last_timestamp": last_timestamp,
            "hash_chain_enabled": True,
            "hash_algorithm": "sha256",
            "hash_chain_tip": chain_tip,
            "chained_events": chained_events,
            "authenticated_checkpoint": checkpoint,
            "checkpoint_enabled": checkpoint.get(
                "enabled",
                False,
            ),
            "checkpoint_status": checkpoint.get(
                "status",
                "UNKNOWN",
            ),
            "checkpoint_keys": checkpoint_key_status(),
            "error": checkpoint.get(
                "error",
                "",
            ),
        }

    except JournalError as exc:
        return {
            "ok": False,
            "path": path,
            "journal_version": (
                JOURNAL_VERSION
            ),
            "versions_present": [],
            "events": None,
            "keyed_events": None,
            "repeated_events": None,
            "last_sequence": None,
            "last_event_id": "",
            "last_event_key": "",
            "last_event_type": "",
            "last_timestamp": "",
            "hash_chain_enabled": True,
            "hash_algorithm": "sha256",
            "hash_chain_tip": "",
            "chained_events": None,
            "checkpoint_keys": checkpoint_key_status(),
            "authenticated_checkpoint": {
                "ok": False,
                "enabled": checkpoint_enabled(),
                "status": "ERROR",
                "algorithm": "hmac-sha256",
                "path": checkpoint_path(),
                "error": str(
                    exc
                ),
            },
            "checkpoint_enabled": checkpoint_enabled(),
            "checkpoint_status": "ERROR",
            "error": str(
                exc
            ),
        }


if __name__ == "__main__":
    print(
        json.dumps(
            journal_stats(),
            ensure_ascii=False,
            indent=2,
        )
    )
