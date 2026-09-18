#!/usr/bin/env python3
"""cgpt-approval-bridge : relai persistant OC <-> CGPT.

Persistance :

  approvals.json
    Etat courant mutable et durable des approbations.

  events.ndjson
    Journal append-only durable des transitions.

Transitions metier journalisees :

  APPROVAL_CREATED
  APPROVAL_APPROVED
  APPROVAL_REJECTED
  APPROVAL_NEEDS_CLARIFICATION
  APPROVAL_CANCELLED
  APPROVAL_EXPIRED

Evenements techniques journalises :

  CONTROLLER_NOTIFICATION_ATTEMPTED
  CONTROLLER_NOTIFICATION_DELIVERED
  CONTROLLER_NOTIFICATION_FAILED
  CONTROLLER_DECISION_RECEIVED
  CONTROLLER_DECISION_REJECTED_CORRELATION

Principe de persistence :

  1. modifier l'etat en memoire ;
  2. sauvegarder durablement approvals.json ;
  3. journaliser durablement l'evenement correspondant.

Ainsi le journal ne peut jamais annoncer volontairement une transition
qui n'a pas d'abord ete persistante dans le magasin d'etat.

Les appels ulterieurs repareront un evenement manquant si le processus
s'interrompt entre les etapes 2 et 3.

Instance unique :

  Un flock exclusif est acquis avant le demarrage des workers.
  Une seconde instance utilisant le meme verrou sort avec le code 73.
  Le fichier de verrou contient uniquement des metadonnees non sensibles.

Protocole : MCP stdio JSON-RPC 2.0.
Dependances externes Python : aucune.
"""

import fcntl
import hashlib
import json
import os
import socket
import sys
import threading
import time
import uuid

from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import datetime, timezone
from urllib import error, parse, request

import cgpt_approval_bridge_journal as journal


SERVER_NAME = "cgpt-approval-bridge"
SERVER_VERSION = "0.72.1"
MCP_PROTOCOL_VERSION = "2024-11-05"

STORE_SCHEMA_VERSION = 2

STATE_BASE_DIR = os.path.expandvars("$HOME/.opencode/state")

DEFAULT_STORE = (
    STATE_BASE_DIR
    + "/cgpt-approval-bridge/approvals.json"
)

DEFAULT_INSTANCE_LOCK = (
    STATE_BASE_DIR
    + "/cgpt-approval-bridge/broker.instance.lock"
)

DEFAULT_TTL_SECONDS = 86400
DEFAULT_CONTROLLER_URL = "http://127.0.0.1:8788"

DEFAULT_POLL_TIMEOUT_SECONDS = 600
DEFAULT_POLL_INTERVAL_SECONDS = 5
DEFAULT_REQUEST_TIMEOUT_SECONDS = 0

CONTROLLER_HTTP_TIMEOUT_SECONDS = 2
CONTROLLER_TCP_TIMEOUT_SECONDS = 1

NOTIFICATION_RETRY_INITIAL_SECONDS = 5
NOTIFICATION_RETRY_MAX_SECONDS = 300
NOTIFICATION_LEASE_SECONDS = 15
REMINDER_INTERVAL_SECONDS = 30

PENDING_WATCHDOG_INTERVAL_SECONDS = int(
    os.environ.get("CGPT_PENDING_WATCHDOG_INTERVAL", "30")
)
PENDING_WATCHDOG_WARNING_SECONDS = int(
    os.environ.get("CGPT_PENDING_WATCHDOG_WARNING", "300")
)
PENDING_WATCHDOG_STALLED_SECONDS = int(
    os.environ.get("CGPT_PENDING_WATCHDOG_STALLED", "900")
)

SESSION_WATCHDOG_INTERVAL_SECONDS = int(
    os.environ.get("CGPT_SESSION_WATCHDOG_INTERVAL", "30")
)
SESSION_WATCHDOG_WARNING_SECONDS = int(
    os.environ.get("CGPT_SESSION_WATCHDOG_WARNING", "300")
)
SESSION_WATCHDOG_STALLED_SECONDS = int(
    os.environ.get("CGPT_SESSION_WATCHDOG_STALLED", "900")
)

REMEDIATION_ORPHAN_TIMEOUT_SECONDS = int(
    os.environ.get("CGPT_REMEDIATION_ORPHAN_TIMEOUT", "300")
)


AUTO_REMEDIATION_CONFIG_ERRORS = []
AUTO_REMEDIATION_CONFIG_WARNINGS = []

AUTO_REMEDIATION_KNOWN_ACTIONS = {
    "RECOVER_NOTIFICATION_LEASE",
    "RECONCILE_PENDING_APPROVALS",
    "RETRY_RECONCILIATION",
    "REPAIR_CONSISTENCY",
}

AUTO_REMEDIATION_SCHEDULER_ACTIONS = {
    "RECOVER_NOTIFICATION_LEASE",
}


def record_auto_remediation_config_error(message):
    """Enregistre une erreur de configuration sans interrompre le broker."""
    if message not in AUTO_REMEDIATION_CONFIG_ERRORS:
        AUTO_REMEDIATION_CONFIG_ERRORS.append(message)


def record_auto_remediation_config_warning(message):
    """Enregistre un avertissement de configuration."""
    if message not in AUTO_REMEDIATION_CONFIG_WARNINGS:
        AUTO_REMEDIATION_CONFIG_WARNINGS.append(message)


def env_flag(name, default=False):
    """Lit un booleen d'environnement sans faire echouer l'import."""
    raw = os.environ.get(name)

    if raw is None:
        return bool(default)

    value = raw.strip().lower()

    if value in ("1", "true", "yes", "on"):
        return True

    if value in ("0", "false", "no", "off", ""):
        return False

    record_auto_remediation_config_error(
        "%s invalide : attendu true/false, yes/no, on/off ou 1/0"
        % name
    )

    return bool(default)


def env_csv(name):
    """Lit une liste CSV d'environnement, normalisee et sans doublons."""
    raw = os.environ.get(name, "")
    result = []

    for value in raw.split(","):
        item = value.strip()

        if item and item not in result:
            result.append(item)

    return result


def env_int_strict(name, default, minimum=None, maximum=None):
    """Lit un entier d'environnement et conserve toute erreur."""
    raw = os.environ.get(name)

    if raw is None or raw.strip() == "":
        value = int(default)

    else:
        try:
            value = int(raw)

        except ValueError:
            record_auto_remediation_config_error(
                "%s invalide : entier attendu" % name
            )
            return int(default)

    if minimum is not None and value < minimum:
        record_auto_remediation_config_error(
            "%s invalide : valeur minimale %d"
            % (
                name,
                minimum,
            )
        )
        return int(default)

    if maximum is not None and value > maximum:
        record_auto_remediation_config_error(
            "%s invalide : valeur maximale %d"
            % (
                name,
                maximum,
            )
        )
        return int(default)

    return value


def validate_auto_remediation_state_path(path):
    """Valide le chemin de persistance du circuit breaker."""
    if not isinstance(path, str) or not path.strip():
        record_auto_remediation_config_error(
            "CGPT_AUTO_REMEDIATION_CB_STATE_PATH ne peut pas etre vide"
        )
        return (
            STATE_BASE_DIR
            + "/cgpt-approval-bridge/auto-remediation-circuit.json"
        )

    normalized = os.path.abspath(path)

    if not path.startswith("/"):
        record_auto_remediation_config_error(
            "CGPT_AUTO_REMEDIATION_CB_STATE_PATH doit etre absolu"
        )

    if path.endswith(os.sep):
        record_auto_remediation_config_error(
            "CGPT_AUTO_REMEDIATION_CB_STATE_PATH doit designer un fichier"
        )

    return normalized


AUTO_REMEDIATION_ENABLED = env_flag(
    "CGPT_AUTO_REMEDIATION_ENABLE",
    False,
)

AUTO_REMEDIATION_REQUESTED_ACTIONS = env_csv(
    "CGPT_AUTO_REMEDIATION_ACTIONS"
)

AUTO_REMEDIATION_INTERVAL_SECONDS = env_int_strict(
    "CGPT_AUTO_REMEDIATION_INTERVAL",
    30,
    minimum=5,
    maximum=86400,
)

AUTO_REMEDIATION_CB_FAILURE_THRESHOLD = env_int_strict(
    "CGPT_AUTO_REMEDIATION_CB_FAILURE_THRESHOLD",
    3,
    minimum=1,
    maximum=100,
)

AUTO_REMEDIATION_CB_FAILURE_WINDOW_SECONDS = env_int_strict(
    "CGPT_AUTO_REMEDIATION_CB_FAILURE_WINDOW",
    300,
    minimum=60,
    maximum=86400,
)

AUTO_REMEDIATION_CB_OPEN_SECONDS = env_int_strict(
    "CGPT_AUTO_REMEDIATION_CB_OPEN_SECONDS",
    600,
    minimum=60,
    maximum=604800,
)

AUTO_REMEDIATION_CIRCUIT_STATE_SCHEMA_VERSION = 1
AUTO_REMEDIATION_CIRCUIT_STATE_PATH = validate_auto_remediation_state_path(
    os.environ.get(
        "CGPT_AUTO_REMEDIATION_CB_STATE_PATH",
        STATE_BASE_DIR + "/cgpt-approval-bridge/auto-remediation-circuit.json",
    )
)


def validate_auto_remediation_configuration():
    """Valide les combinaisons de configuration d'auto-remediation."""
    requested = list(AUTO_REMEDIATION_REQUESTED_ACTIONS)

    unknown = sorted(
        code
        for code in requested
        if code not in AUTO_REMEDIATION_KNOWN_ACTIONS
    )

    for code in unknown:
        record_auto_remediation_config_error(
            "CGPT_AUTO_REMEDIATION_ACTIONS contient une action inconnue : %s"
            % code
        )

    if AUTO_REMEDIATION_ENABLED and not requested:
        record_auto_remediation_config_error(
            "CGPT_AUTO_REMEDIATION_ENABLE=true exige une allowlist "
            "CGPT_AUTO_REMEDIATION_ACTIONS non vide"
        )

    unsupported_scheduler = sorted(
        code
        for code in requested
        if (
            code in AUTO_REMEDIATION_KNOWN_ACTIONS
            and code not in AUTO_REMEDIATION_SCHEDULER_ACTIONS
        )
    )

    if AUTO_REMEDIATION_ENABLED and unsupported_scheduler:
        record_auto_remediation_config_error(
            "actions non supportees par l'ordonnanceur automatique : %s"
            % ", ".join(unsupported_scheduler)
        )

    if (
        AUTO_REMEDIATION_CB_OPEN_SECONDS
        < AUTO_REMEDIATION_INTERVAL_SECONDS
    ):
        record_auto_remediation_config_warning(
            "CGPT_AUTO_REMEDIATION_CB_OPEN_SECONDS est inferieur "
            "a l'intervalle de l'ordonnanceur"
        )

    if (
        AUTO_REMEDIATION_CB_FAILURE_WINDOW_SECONDS
        < AUTO_REMEDIATION_INTERVAL_SECONDS
    ):
        record_auto_remediation_config_warning(
            "CGPT_AUTO_REMEDIATION_CB_FAILURE_WINDOW est inferieur "
            "a l'intervalle de l'ordonnanceur"
        )

    return {
        "valid": not AUTO_REMEDIATION_CONFIG_ERRORS,
        "errors": list(AUTO_REMEDIATION_CONFIG_ERRORS),
        "warnings": list(AUTO_REMEDIATION_CONFIG_WARNINGS),
    }


AUTO_REMEDIATION_CONFIGURATION = validate_auto_remediation_configuration()

MAX_CONTROL_WORKERS = 2
MAX_CONTROL_QUEUE = 2
MAX_CONTROL_CAPACITY = MAX_CONTROL_WORKERS + MAX_CONTROL_QUEUE

MAX_FAST_WORKERS = 4
MAX_FAST_QUEUE = 16
MAX_FAST_CAPACITY = MAX_FAST_WORKERS + MAX_FAST_QUEUE

MAX_BLOCKING_WORKERS = 8
MAX_BLOCKING_QUEUE = 8
MAX_BLOCKING_CAPACITY = (
    MAX_BLOCKING_WORKERS
    + MAX_BLOCKING_QUEUE
)

BLOCKING_TOOLS = (
    "request_validation",
    "poll_approval",
)

CONTROL_TOOLS = (
    "broker_health",
    "broker_repair_consistency",
    "broker_rotate_journal_checkpoint",
)

DIRECT_CONTROL_METHODS = (
    "initialize",
    "ping",
    "tools/list",
)

KNOWN_NOTIFICATIONS = (
    "notifications/initialized",
    "notifications/cancelled",
)

VALID_STATES = (
    "PENDING",
    "APPROVED",
    "REJECTED",
    "NEEDS_CLARIFICATION",
    "CANCELLED",
    "EXPIRED",
)

TERMINAL_STATES = (
    "APPROVED",
    "REJECTED",
    "NEEDS_CLARIFICATION",
    "CANCELLED",
    "EXPIRED",
)

DECIDABLE = (
    "PENDING",
)

STATUS_EVENT_TYPES = {
    "APPROVED": "APPROVAL_APPROVED",
    "REJECTED": "APPROVAL_REJECTED",
    "NEEDS_CLARIFICATION": "APPROVAL_NEEDS_CLARIFICATION",
    "CANCELLED": "APPROVAL_CANCELLED",
    "EXPIRED": "APPROVAL_EXPIRED",
}

THREAD_STORE_LOCK = threading.RLock()
OUTPUT_LOCK = threading.Lock()

ACTIVE_REQUESTS = {}
ACTIVE_REQUESTS_LOCK = threading.Lock()

CONTROL_CAPACITY = threading.BoundedSemaphore(
    MAX_CONTROL_CAPACITY
)

CONTROL_STATE_LOCK = threading.Lock()
CONTROL_INFLIGHT = 0

FAST_CAPACITY = threading.BoundedSemaphore(
    MAX_FAST_CAPACITY
)

FAST_STATE_LOCK = threading.Lock()
FAST_INFLIGHT = 0

BLOCKING_CAPACITY = threading.BoundedSemaphore(
    MAX_BLOCKING_CAPACITY
)

BLOCKING_STATE_LOCK = threading.Lock()
BLOCKING_INFLIGHT = 0

RECONCILIATION_LOCK = threading.Lock()
RECONCILIATION_RUNNING = False
RECONCILIATION_LAST_STARTED_AT = ""
RECONCILIATION_LAST_FINISHED_AT = ""
RECONCILIATION_LAST_ERROR = ""

PROCESS_STARTED_AT = ""
INSTANCE_ID = ""
INSTANCE_LOCK_HANDLE = None
INSTANCE_LOCK_METADATA = {}
INSTANCE_PREVIOUS_METADATA = {}
INSTANCE_PREVIOUS_SHUTDOWN_STATE = "UNKNOWN"
CRASH_RECOVERY_REPORT = {}

PENDING_WATCHDOG_LOCK = threading.Lock()
PENDING_WATCHDOG_STOP = threading.Event()
PENDING_WATCHDOG_STATE = {}
PENDING_WATCHDOG_LAST_RUN_AT = ""
PENDING_WATCHDOG_LAST_ERROR = ""

SESSION_WATCHDOG_LOCK = threading.Lock()
SESSION_WATCHDOG_STOP = threading.Event()
READINESS_PUBLISH_STOP = threading.Event()
READINESS_PUBLISH_INTERVAL_SECONDS = 30
SESSION_WATCHDOG_STATE = {}
SESSION_WATCHDOG_LAST_RUN_AT = ""
SESSION_WATCHDOG_LAST_ERROR = ""
ROOT_CAUSE_LOCK = threading.Lock()
ROOT_CAUSE_STATE = {}

AUTO_REMEDIATION_LOCK = threading.Lock()
AUTO_REMEDIATION_STOP = threading.Event()
AUTO_REMEDIATION_STATE = {
    "last_run_at": "",
    "last_error": "",
    "last_action": "",
    "last_approval_id": "",
    "last_result": "",
}
AUTO_REMEDIATION_CIRCUIT = {
    "state": "CLOSED",
    "opened_at": "",
    "open_until": "",
    "half_open_probe_inflight": False,
    "consecutive_failures": 0,
    "failure_timestamps": [],
    "last_transition_at": "",
    "last_reason": "",
}
AUTO_REMEDIATION_CIRCUIT_LOCK = threading.Lock()
AUTO_REMEDIATION_CIRCUIT_PERSISTENCE = {
    "loaded": False,
    "loaded_at": "",
    "saved_at": "",
    "last_error": "",
    "path": AUTO_REMEDIATION_CIRCUIT_STATE_PATH,
}

SESSION_LAST_MCP_ACTIVITY_AT = ""
SESSION_LAST_CONTROLLER_ACTIVITY_AT = ""


class StoreError(Exception):
    """Erreur du magasin persistant."""


class ValidationError(Exception):
    """Erreur de validation d'entree."""


class RequestCancelled(Exception):
    """L'appel MCP courant a ete annule."""


class DuplicateRequestId(Exception):
    """L'id JSON-RPC de transport est deja actif."""


class InstanceLockError(Exception):
    """Une autre instance du broker detient deja le verrou exclusif."""


def utc_now():
    return (
        datetime.now(timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )


def utc_from_timestamp(timestamp):
    return (
        datetime.fromtimestamp(
            timestamp,
            tz=timezone.utc,
        )
        .isoformat()
        .replace("+00:00", "Z")
    )


def parse_utc(value):
    if (
        not value
        or not isinstance(value, str)
    ):
        return None

    try:
        return datetime.fromisoformat(
            value.replace(
                "Z",
                "+00:00",
            )
        ).timestamp()

    except ValueError:
        return None


def instance_lock_path():
    """Retourne le verrou exclusif de l'instance broker."""
    return os.environ.get(
        "CGPT_BROKER_INSTANCE_LOCK",
        DEFAULT_INSTANCE_LOCK,
    )


def new_instance_id():
    """Genere un identifiant unique pour le processus broker."""
    return (
        "inst-"
        + uuid.uuid4().hex
    )


def read_instance_lock_metadata(handle):
    """Lit les metadonnees presentes dans le fichier de verrou."""
    try:
        handle.seek(0)
        raw = handle.read()
    except OSError:
        return {}

    if not raw.strip():
        return {}

    try:
        value = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {
            "raw": raw[:500],
        }

    return value if isinstance(value, dict) else {}


def acquire_instance_lock():
    """Acquiert le verrou exclusif conserve pendant toute la vie du broker."""
    global INSTANCE_ID
    global INSTANCE_LOCK_HANDLE
    global INSTANCE_LOCK_METADATA
    global INSTANCE_PREVIOUS_METADATA

    path = instance_lock_path()
    ensure_parent(path)

    try:
        handle = open(
            path,
            "a+",
            encoding="utf-8",
        )
    except OSError as exc:
        raise InstanceLockError(
            "ouverture verrou instance impossible: %s"
            % exc
        ) from exc

    previous_metadata = read_instance_lock_metadata(
        handle
    )

    try:
        fcntl.flock(
            handle.fileno(),
            fcntl.LOCK_EX | fcntl.LOCK_NB,
        )
    except BlockingIOError as exc:
        owner = read_instance_lock_metadata(
            handle
        )
        handle.close()

        owner_id = owner.get(
            "instance_id",
            "inconnu",
        )
        owner_pid = owner.get(
            "pid",
            "inconnu",
        )
        owner_host = owner.get(
            "hostname",
            "inconnu",
        )

        raise InstanceLockError(
            "broker deja actif: instance_id=%s pid=%s hostname=%s lock=%s"
            % (
                owner_id,
                owner_pid,
                owner_host,
                path,
            )
        ) from exc
    except OSError as exc:
        handle.close()
        raise InstanceLockError(
            "verrouillage instance impossible: %s"
            % exc
        ) from exc

    INSTANCE_ID = new_instance_id()
    metadata = {
        "instance_id": INSTANCE_ID,
        "pid": os.getpid(),
        "hostname": socket.gethostname(),
        "started_at": PROCESS_STARTED_AT,
        "server_name": SERVER_NAME,
        "server_version": SERVER_VERSION,
        "lock_path": path,
    }

    try:
        handle.seek(0)
        handle.truncate(0)
        json.dump(
            metadata,
            handle,
            ensure_ascii=False,
            indent=2,
        )
        handle.write("\n")
        handle.flush()
        os.fsync(
            handle.fileno()
        )
    except OSError as exc:
        try:
            fcntl.flock(
                handle.fileno(),
                fcntl.LOCK_UN,
            )
        except OSError:
            pass
        handle.close()
        raise InstanceLockError(
            "ecriture metadonnees instance impossible: %s"
            % exc
        ) from exc

    INSTANCE_LOCK_HANDLE = handle
    INSTANCE_LOCK_METADATA = metadata
    INSTANCE_PREVIOUS_METADATA = (
        previous_metadata
        if isinstance(previous_metadata, dict)
        else {}
    )

    return dict(metadata)




def previous_instance_shutdown_state(previous_id):
    """Determine si la derniere execution connue s'est terminee proprement."""
    if not previous_id:
        return "UNKNOWN"

    try:
        events = journal.read_events()
    except (journal.JournalError, journal.JournalValidationError):
        return "UNKNOWN"

    started_sequence = None
    stopping_sequence = None
    stopped_sequence = None

    for event in events:
        data = event.get("data", {})

        if not isinstance(data, dict):
            continue

        if data.get("instance_id") != previous_id:
            continue

        event_type = event.get("event_type")
        sequence = event.get("sequence")

        if event_type == "BROKER_INSTANCE_STARTED":
            started_sequence = sequence
            stopping_sequence = None
            stopped_sequence = None

        elif (
            event_type == "BROKER_INSTANCE_STOPPING"
            and started_sequence is not None
            and sequence > started_sequence
        ):
            stopping_sequence = sequence

        elif (
            event_type == "BROKER_INSTANCE_STOPPED"
            and started_sequence is not None
            and sequence > started_sequence
        ):
            stopped_sequence = sequence

    if started_sequence is None:
        return "UNKNOWN"

    if stopped_sequence is not None:
        return "CLEAN"

    return "UNCLEAN"

def instance_lifecycle_event(
    event_type,
    phase,
    data=None,
):
    """Journalise une etape du cycle de vie de cette instance."""
    if not INSTANCE_ID:
        return None

    payload = {
        "instance_id": INSTANCE_ID,
        "pid": os.getpid(),
        "hostname": socket.gethostname(),
        "started_at": PROCESS_STARTED_AT,
        "server_version": SERVER_VERSION,
        "lock_path": instance_lock_path(),
    }

    if data:
        payload.update(data)

    return journal.append_unique_event(
        event_type=event_type,
        event_key=(
            "broker-instance:%s:%s"
            % (INSTANCE_ID, phase)
        ),
        actor="BROKER",
        data=payload,
    )


def journal_instance_started():
    """Journalise la prise de possession effective du verrou."""
    global INSTANCE_PREVIOUS_SHUTDOWN_STATE

    previous = INSTANCE_PREVIOUS_METADATA

    previous_id = (
        previous.get("instance_id", "")
        if isinstance(previous, dict)
        else ""
    )

    INSTANCE_PREVIOUS_SHUTDOWN_STATE = (
        previous_instance_shutdown_state(previous_id)
    )

    if previous_id and previous_id != INSTANCE_ID:
        if INSTANCE_PREVIOUS_SHUTDOWN_STATE == "UNCLEAN":
            instance_lifecycle_event(
                "BROKER_INSTANCE_UNCLEAN_SHUTDOWN_DETECTED",
                "unclean-shutdown-detected",
                {
                    "previous_instance": {
                        "instance_id": previous.get("instance_id", ""),
                        "pid": previous.get("pid"),
                        "hostname": previous.get("hostname", ""),
                        "started_at": previous.get("started_at", ""),
                        "server_version": previous.get("server_version", ""),
                    },
                    "previous_shutdown_state": (
                        INSTANCE_PREVIOUS_SHUTDOWN_STATE
                    ),
                    "detected_at": utc_now(),
                },
            )

        instance_lifecycle_event(
            "BROKER_INSTANCE_RECOVERED_STALE_METADATA",
            "recovered-stale-metadata",
            {
                "previous_instance": {
                    "instance_id": previous.get("instance_id", ""),
                    "pid": previous.get("pid"),
                    "hostname": previous.get("hostname", ""),
                    "started_at": previous.get("started_at", ""),
                    "server_version": previous.get("server_version", ""),
                },
                "previous_shutdown_state": (
                    INSTANCE_PREVIOUS_SHUTDOWN_STATE
                ),
            },
        )

    return instance_lifecycle_event(
        "BROKER_INSTANCE_STARTED",
        "started",
        {
            "previous_shutdown_state": (
                INSTANCE_PREVIOUS_SHUTDOWN_STATE
            ),
        },
    )


def journal_instance_stopping(reason="stdio_closed"):
    """Journalise le debut d'un arret propre."""
    return instance_lifecycle_event(
        "BROKER_INSTANCE_STOPPING",
        "stopping",
        {
            "reason": reason,
            "stopping_at": utc_now(),
        },
    )


def journal_instance_stopped(reason="stdio_closed"):
    """Journalise la fin d'un arret propre avant liberation du verrou."""
    return instance_lifecycle_event(
        "BROKER_INSTANCE_STOPPED",
        "stopped",
        {
            "reason": reason,
            "stopped_at": utc_now(),
        },
    )


def release_instance_lock():
    """Libere explicitement le verrou d'instance a l'arret normal."""
    global INSTANCE_LOCK_HANDLE

    handle = INSTANCE_LOCK_HANDLE
    INSTANCE_LOCK_HANDLE = None

    if handle is None:
        return

    try:
        fcntl.flock(
            handle.fileno(),
            fcntl.LOCK_UN,
        )
    except OSError:
        pass

    try:
        handle.close()
    except OSError:
        pass


def instance_snapshot():
    """Expose uniquement les metadonnees non sensibles de l'instance."""
    return {
        "instance_id": INSTANCE_ID,
        "exclusive_lock": (
            INSTANCE_LOCK_HANDLE is not None
        ),
        "lock_path": instance_lock_path(),
        "pid": os.getpid(),
        "hostname": socket.gethostname(),
        "started_at": PROCESS_STARTED_AT,
        "previous_instance_id": (
            INSTANCE_PREVIOUS_METADATA.get(
                "instance_id",
                "",
            )
            if isinstance(
                INSTANCE_PREVIOUS_METADATA,
                dict,
            )
            else ""
        ),
        "previous_shutdown_state": (
            INSTANCE_PREVIOUS_SHUTDOWN_STATE
        ),
        "crash_recovery": dict(CRASH_RECOVERY_REPORT),
    }



def journal_crash_recovery_event(event_type, recovery_id, phase, data=None):
    """Journalise une etape idempotente de recuperation post-crash."""
    payload = {
        "recovery_id": recovery_id,
        "instance_id": INSTANCE_ID,
        "previous_instance_id": (
            INSTANCE_PREVIOUS_METADATA.get("instance_id", "")
            if isinstance(INSTANCE_PREVIOUS_METADATA, dict)
            else ""
        ),
        "previous_shutdown_state": INSTANCE_PREVIOUS_SHUTDOWN_STATE,
    }
    if data:
        payload.update(data)
    return journal.append_unique_event(
        event_type=event_type,
        event_key="broker-crash-recovery:%s:%s" % (recovery_id, phase),
        actor="BROKER",
        data=payload,
    )


def recover_after_unclean_shutdown():
    """Inspecte et repare uniquement les etats techniques non ambigus apres crash."""
    global CRASH_RECOVERY_REPORT

    if INSTANCE_PREVIOUS_SHUTDOWN_STATE != "UNCLEAN":
        CRASH_RECOVERY_REPORT = {
            "status": "NOT_REQUIRED",
            "performed": False,
            "human_required": False,
        }
        return dict(CRASH_RECOVERY_REPORT)

    recovery_id = "recovery-" + uuid.uuid4().hex[:16]
    started_at = utc_now()
    journal_crash_recovery_event(
        "BROKER_CRASH_RECOVERY_STARTED",
        recovery_id,
        "started",
        {"started_at": started_at},
    )

    path = store_path()
    pending_ids = []
    recovered_leases = []
    expired_ids = []

    with locked_store(path):
        data = load_store(path)
        approvals = data["approvals"]
        changed = False

        for item in approvals.values():
            approval_id = item.get("approval_id", "")

            if check_expired(item):
                changed = True
                if approval_id:
                    expired_ids.append(approval_id)

            if (
                item.get("status") == "PENDING"
                and item.get("notification_status") == "SENDING"
            ):
                recovered_leases.append({
                    "approval_id": approval_id,
                    "lease_id": item.get("notification_lease_id", ""),
                })
                item["notification_status"] = "FAILED"
                item["notification_lease_id"] = ""
                item["notification_lease_until"] = ""
                item["notification_next_retry_at"] = ""
                item["notification_updated_at"] = utc_now()
                changed = True

            if item.get("status") == "PENDING" and approval_id:
                pending_ids.append(approval_id)

        if changed:
            save_store(path, data)

        for item in approvals.values():
            repair_journal_for_item(item)

    consistency_before = store_journal_consistency_snapshot()
    repair_result = None
    if (
        consistency_before.get("missing_created_events")
        or consistency_before.get("missing_terminal_events")
    ):
        repair_result = do_repair_consistency()

    consistency_after = store_journal_consistency_snapshot()
    human_required = not consistency_after.get("ok", False)

    resumed_decisions = []
    renotified_approvals = []
    still_pending = []

    # Reprise active uniquement si la coherence store/journal est sure.
    # On recherche d'abord une decision deja detenue par le controleur.
    # Une nouvelle notification n'est envoyee qu'en l'absence de decision.
    if not human_required:
        for approval_id in list(pending_ids):
            with locked_store(path):
                current_data = load_store(path)
                current = current_data["approvals"].get(approval_id)

                if (
                    current is None
                    or current.get("status") != "PENDING"
                ):
                    continue

                snapshot = dict(current)

            decision = controller_decision(snapshot)

            if decision is not None:
                applied = False

                with locked_store(path):
                    current_data = load_store(path)
                    current = current_data["approvals"].get(approval_id)

                    if (
                        current is not None
                        and current.get("status") == "PENDING"
                        and apply_controller_decision(current, decision)
                    ):
                        current["recovered_after_crash_at"] = utc_now()
                        current["recovery_id"] = recovery_id
                        save_store(path, current_data)
                        repair_journal_for_item(current)
                        applied = True

                if applied:
                    resumed_decisions.append(approval_id)
                    journal.append_unique_event(
                        event_type=(
                            "BROKER_CRASH_RECOVERY_DECISION_APPLIED"
                        ),
                        event_key=(
                            "broker-crash-recovery:%s:decision:%s"
                            % (recovery_id, approval_id)
                        ),
                        actor="BROKER",
                        approval_id=approval_id,
                        request_id=snapshot.get("requestId", ""),
                        change_id=snapshot.get("change_id", ""),
                        data={
                            "recovery_id": recovery_id,
                            "decision": decision.get("decision", ""),
                            "decision_id": decision.get("decision_id", ""),
                        },
                    )
                    continue

            # Aucune decision exploitable : remettre le cycle de notification
            # en marche. maybe_notify_controller() gere lui-meme lease/backoff.
            if maybe_notify_controller(snapshot):
                renotified_approvals.append(approval_id)
                journal.append_unique_event(
                    event_type="BROKER_CRASH_RECOVERY_RENOTIFIED",
                    event_key=(
                        "broker-crash-recovery:%s:renotify:%s"
                        % (recovery_id, approval_id)
                    ),
                    actor="BROKER",
                    approval_id=approval_id,
                    request_id=snapshot.get("requestId", ""),
                    change_id=snapshot.get("change_id", ""),
                    data={
                        "recovery_id": recovery_id,
                        "notification_delivered": True,
                    },
                )

            with locked_store(path):
                current_data = load_store(path)
                current = current_data["approvals"].get(approval_id)
                if (
                    current is not None
                    and current.get("status") == "PENDING"
                ):
                    still_pending.append(approval_id)
    else:
        still_pending = list(pending_ids)

    for recovered in recovered_leases:
        journal.append_unique_event(
            event_type="BROKER_CRASH_RECOVERY_LEASE_RESET",
            event_key=(
                "broker-crash-recovery:%s:lease:%s"
                % (recovery_id, recovered.get("approval_id", ""))
            ),
            actor="BROKER",
            approval_id=recovered.get("approval_id", ""),
            data={
                "recovery_id": recovery_id,
                "previous_lease_id": recovered.get("lease_id", ""),
                "notification_status": "FAILED",
            },
        )

    status = "HUMAN_REQUIRED" if human_required else "RECOVERED"
    report = {
        "status": status,
        "performed": True,
        "recovery_id": recovery_id,
        "started_at": started_at,
        "completed_at": utc_now(),
        "pending_approvals": still_pending,
        "pending_count": len(still_pending),
        "initial_pending_count": len(pending_ids),
        "resumed_decisions": resumed_decisions,
        "resumed_decision_count": len(resumed_decisions),
        "renotified_approvals": renotified_approvals,
        "renotified_count": len(renotified_approvals),
        "recovered_notification_leases": len(recovered_leases),
        "expired_approvals": expired_ids,
        "consistency_ok": consistency_after.get("ok", False),
        "consistency": consistency_after,
        "repair_result": repair_result,
        "human_required": human_required,
    }

    journal_crash_recovery_event(
        "BROKER_CRASH_RECOVERY_COMPLETED",
        recovery_id,
        "completed",
        {
            "status": status,
            "pending_count": len(still_pending),
            "initial_pending_count": len(pending_ids),
            "resumed_decision_count": len(resumed_decisions),
            "renotified_count": len(renotified_approvals),
            "recovered_notification_leases": len(recovered_leases),
            "expired_count": len(expired_ids),
            "consistency_ok": consistency_after.get("ok", False),
            "human_required": human_required,
        },
    )

    CRASH_RECOVERY_REPORT = report
    return dict(report)

def new_approval_id():
    return (
        "apr-"
        + uuid.uuid4().hex[:16]
    )


def new_business_request_id():
    return (
        "req-"
        + uuid.uuid4().hex[:16]
    )


def new_store():
    return {
        "schema_version": STORE_SCHEMA_VERSION,
        "approvals": {},
    }


def store_path():
    return os.environ.get(
        "CGPT_APPROVAL_STORE",
        DEFAULT_STORE,
    )


def store_lock_path(path):
    return path + ".lock"


def ensure_parent(path):
    parent = os.path.dirname(path)

    if parent:
        os.makedirs(
            parent,
            exist_ok=True,
        )


@contextmanager
def locked_store(path):
    ensure_parent(path)

    lock_path = store_lock_path(
        path
    )

    with THREAD_STORE_LOCK:
        try:
            lock_handle = open(
                lock_path,
                "a+",
                encoding="utf-8",
            )

        except OSError as exc:
            raise StoreError(
                "ouverture verrou magasin impossible: %s"
                % exc
            ) from exc

        try:
            try:
                fcntl.flock(
                    lock_handle.fileno(),
                    fcntl.LOCK_EX,
                )

            except OSError as exc:
                raise StoreError(
                    "verrouillage magasin impossible: %s"
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


def raw_load_store(path):
    try:
        with open(
            path,
            "r",
            encoding="utf-8",
        ) as handle:
            return json.load(
                handle
            )

    except FileNotFoundError:
        return new_store()

    except (
        json.JSONDecodeError,
        OSError,
    ) as exc:
        raise StoreError(
            "magasin illisible: %s"
            % exc
        ) from exc


def normalize_legacy_request_ids(item):
    legacy = item.get(
        "legacy_requestIds",
        [],
    )

    if legacy is None:
        legacy = []

    if not isinstance(
        legacy,
        list,
    ):
        raise StoreError(
            "legacy_requestIds doit etre une liste"
        )

    result = []

    for value in legacy:
        if (
            isinstance(value, str)
            and value
            and value not in result
        ):
            result.append(
                value
            )

    item[
        "legacy_requestIds"
    ] = result

    return result


def migrate_store_v1_to_v2(data):
    approvals = data.get(
        "approvals"
    )

    if not isinstance(
        approvals,
        dict,
    ):
        raise StoreError(
            "magasin v1 corrompu: approvals absent"
        )

    for key, item in approvals.items():
        if not isinstance(
            item,
            dict,
        ):
            raise StoreError(
                "approbation '%s' invalide"
                % key
            )

        approval_id = item.get(
            "approval_id"
        )

        if not approval_id:
            approval_id = key

            item[
                "approval_id"
            ] = approval_id

        legacy = normalize_legacy_request_ids(
            item
        )

        request_id = item.get(
            "requestId"
        )

        if (
            not isinstance(
                request_id,
                str,
            )
            or not request_id
        ):
            item[
                "requestId"
            ] = new_business_request_id()

        elif request_id == approval_id:
            if request_id not in legacy:
                legacy.append(
                    request_id
                )

            item[
                "requestId"
            ] = new_business_request_id()

        item[
            "legacy_requestIds"
        ] = legacy

        item[
            "store_migrated_from"
        ] = 1

        item[
            "store_migrated_at"
        ] = utc_now()

    data[
        "schema_version"
    ] = 2

    return data


def migrate_store(data):
    if not isinstance(
        data,
        dict,
    ):
        raise StoreError(
            "magasin corrompu: objet JSON attendu"
        )

    approvals = data.get(
        "approvals"
    )

    if not isinstance(
        approvals,
        dict,
    ):
        raise StoreError(
            "magasin corrompu: approvals invalide"
        )

    version = data.get(
        "schema_version"
    )

    if version is None:
        version = 1

    if (
        not isinstance(
            version,
            int,
        )
        or isinstance(
            version,
            bool,
        )
    ):
        raise StoreError(
            "schema_version invalide"
        )

    if version > STORE_SCHEMA_VERSION:
        raise StoreError(
            "schema magasin trop recent : %s > %s"
            % (
                version,
                STORE_SCHEMA_VERSION,
            )
        )

    migrated = False

    while version < STORE_SCHEMA_VERSION:
        if version == 1:
            data = migrate_store_v1_to_v2(
                data
            )

            version = 2
            migrated = True

        else:
            raise StoreError(
                "migration inconnue depuis schema %s"
                % version
            )

    for item in data[
        "approvals"
    ].values():
        normalize_legacy_request_ids(
            item
        )

    data[
        "schema_version"
    ] = STORE_SCHEMA_VERSION

    return (
        data,
        migrated,
    )


def fsync_directory(path):
    directory = os.path.dirname(
        path
    )

    if not directory:
        directory = "."

    flags = os.O_RDONLY

    if hasattr(
        os,
        "O_DIRECTORY",
    ):
        flags |= os.O_DIRECTORY

    try:
        directory_fd = os.open(
            directory,
            flags,
        )

    except OSError as exc:
        raise StoreError(
            "ouverture repertoire pour fsync impossible: %s"
            % exc
        ) from exc

    try:
        os.fsync(
            directory_fd
        )

    except OSError as exc:
        raise StoreError(
            "fsync repertoire impossible: %s"
            % exc
        ) from exc

    finally:
        os.close(
            directory_fd
        )


def save_store(
    path,
    data,
):
    """Ecrit atomiquement et durablement le magasin."""
    ensure_parent(
        path
    )

    data[
        "schema_version"
    ] = STORE_SCHEMA_VERSION

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
                data,
                handle,
                ensure_ascii=False,
                indent=2,
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

        fsync_directory(
            path
        )

    except OSError as exc:
        raise StoreError(
            "ecriture durable magasin impossible: %s"
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


def load_store(path):
    data = raw_load_store(
        path
    )

    data, migrated = migrate_store(
        data
    )

    if migrated:
        save_store(
            path,
            data,
        )

    return data


def item_request_ids(item):
    result = []

    request_id = item.get(
        "requestId"
    )

    if (
        isinstance(
            request_id,
            str,
        )
        and request_id
    ):
        result.append(
            request_id
        )

    for value in item.get(
        "legacy_requestIds",
        [],
    ):
        if (
            isinstance(
                value,
                str,
            )
            and value
            and value not in result
        ):
            result.append(
                value
            )

    return result


def request_id_matches_item(
    item,
    request_id,
):
    if not request_id:
        return False

    return request_id in item_request_ids(
        item
    )


def find_by_request_id(
    approvals,
    request_id,
):
    if not request_id:
        return None

    matches = []

    for item in approvals.values():
        if request_id_matches_item(
            item,
            request_id,
        ):
            matches.append(
                item
            )

    if not matches:
        return None

    if len(matches) > 1:
        raise StoreError(
            "requestId '%s' correspond a plusieurs approbations"
            % request_id
        )

    return matches[
        0
    ]


def check_request_id_uniqueness(
    approvals,
):
    owners = {}

    for item in approvals.values():
        approval_id = item.get(
            "approval_id"
        )

        for request_id in item_request_ids(
            item
        ):
            previous = owners.get(
                request_id
            )

            if (
                previous is not None
                and previous != approval_id
            ):
                return (
                    False,
                    request_id,
                )

            owners[
                request_id
            ] = approval_id

    return (
        True,
        "",
    )


def journal_event_exists(
    approval_id,
    event_type,
):
    events = journal.read_events(
        approval_id=approval_id,
        event_type=event_type,
        limit=1,
    )

    return bool(
        events
    )


def ensure_journal_event(
    item,
    event_type,
    actor,
    data=None,
):
    approval_id = item.get(
        "approval_id",
        "",
    )

    if not approval_id:
        raise journal.JournalValidationError(
            "approval_id absent pour journalisation"
        )

    if journal_event_exists(
        approval_id,
        event_type,
    ):
        return None

    payload = {
        "status": item.get(
            "status",
            "",
        ),
    }

    if data:
        payload.update(
            data
        )

    return journal.append_event(
        event_type=event_type,
        approval_id=approval_id,
        request_id=item.get(
            "requestId",
            "",
        ),
        change_id=item.get(
            "change_id",
            "",
        ),
        actor=actor,
        data=payload,
    )


def ensure_created_event(item):
    return ensure_journal_event(
        item,
        "APPROVAL_CREATED",
        "OC",
        {
            "title": item.get(
                "title",
                "",
            ),
            "files": item.get(
                "files",
                [],
            ),
            "summary": item.get(
                "summary",
                "",
            ),
            "expires_at": item.get(
                "expires_at",
                "",
            ),
        },
    )


def terminal_event_actor(item):
    status = item.get(
        "status"
    )

    if status == "EXPIRED":
        return "BROKER"

    if status == "CANCELLED":
        return (
            item.get(
                "cancelled_by",
                "",
            )
            or "OC"
        )

    return (
        item.get(
            "reviewer",
            "",
        )
        or "CGPT"
    )


def terminal_event_data(item):
    status = item.get(
        "status"
    )

    payload = {
        "status": status,
    }

    if status in (
        "APPROVED",
        "REJECTED",
        "NEEDS_CLARIFICATION",
    ):
        payload.update(
            {
                "reviewer": item.get(
                    "reviewer",
                    "",
                ),
                "comment": item.get(
                    "comment",
                    "",
                ),
                "decision_id": item.get(
                    "decision_id",
                    "",
                ),
                "decision_applied_at": item.get(
                    "decision_applied_at",
                    "",
                ),
            }
        )

    elif status == "CANCELLED":
        payload.update(
            {
                "cancelled_at": item.get(
                    "cancelled_at",
                    item.get(
                        "updated_at",
                        "",
                    ),
                ),
                "cancelled_by": item.get(
                    "cancelled_by",
                    "OC",
                ),
            }
        )

    elif status == "EXPIRED":
        payload.update(
            {
                "expires_at": item.get(
                    "expires_at",
                    "",
                ),
                "expired_at": item.get(
                    "expired_at",
                    item.get(
                        "updated_at",
                        "",
                    ),
                ),
            }
        )

    return payload


def ensure_terminal_event(item):
    status = item.get(
        "status"
    )

    event_type = STATUS_EVENT_TYPES.get(
        status
    )

    if event_type is None:
        return None

    return ensure_journal_event(
        item,
        event_type,
        terminal_event_actor(
            item
        ),
        terminal_event_data(
            item
        ),
    )


def repair_journal_for_item(item):
    """Repare les evenements fondamentaux manquants."""
    ensure_created_event(
        item
    )

    ensure_terminal_event(
        item
    )


def check_expired(item):
    """Applique EXPIRED en memoire.

    La sauvegarde durable et la journalisation restent de la
    responsabilite de l'appelant.
    """
    if item.get(
        "status"
    ) != "PENDING":
        return False

    expires_timestamp = parse_utc(
        item.get(
            "expires_at"
        )
    )

    if expires_timestamp is None:
        return False

    if time.time() < expires_timestamp:
        return False

    now = utc_now()

    item[
        "status"
    ] = "EXPIRED"

    item[
        "updated_at"
    ] = now

    item[
        "expired_at"
    ] = now

    return True


def controller_url():
    return os.environ.get(
        "CGPT_CONTROLLER_URL",
        DEFAULT_CONTROLLER_URL,
    ).rstrip(
        "/"
    )


def controller_endpoint():
    parsed = parse.urlparse(
        controller_url()
    )

    hostname = parsed.hostname

    if not hostname:
        return (
            None,
            None,
        )

    if parsed.port is not None:
        port = parsed.port

    elif parsed.scheme == "https":
        port = 443

    else:
        port = 80

    return (
        hostname,
        port,
    )


def controller_tcp_reachable():
    host, port = controller_endpoint()

    if (
        host is None
        or port is None
    ):
        return False

    try:
        with socket.create_connection(
            (
                host,
                port,
            ),
            timeout=(
                CONTROLLER_TCP_TIMEOUT_SECONDS
            ),
        ):
            return True

    except OSError:
        return False


def controller_event_key(
    item,
    suffix,
    correlation_id,
):
    approval_id = item.get(
        "approval_id",
        "",
    )

    return (
        "controller:%s:%s:%s"
        % (
            approval_id,
            correlation_id,
            suffix,
        )
    )


def journal_controller_event(
    item,
    event_type,
    event_key,
    data=None,
):
    return journal.append_unique_event(
        event_type=event_type,
        event_key=event_key,
        approval_id=item.get(
            "approval_id",
            "",
        ),
        request_id=item.get(
            "requestId",
            "",
        ),
        change_id=item.get(
            "change_id",
            "",
        ),
        actor="BROKER",
        data=(
            data
            if data is not None
            else {}
        ),
    )


def notify_controller(
    item,
    lease_id,
):
    endpoint = (
        controller_url()
        + "/validation/request"
    )

    attempted_key = controller_event_key(
        item,
        "notification-attempted",
        lease_id,
    )

    journal_controller_event(
        item,
        "CONTROLLER_NOTIFICATION_ATTEMPTED",
        attempted_key,
        {
            "lease_id": lease_id,
            "endpoint": endpoint,
        },
    )

    payload = json.dumps(
        {
            "event": "validation.request",
            "approval": item,
        },
        ensure_ascii=False,
    ).encode(
        "utf-8"
    )

    http_request = request.Request(
        endpoint,
        data=payload,
        headers={
            "Content-Type": "application/json",
        },
        method="POST",
    )

    delivered = False
    status = None
    failure = ""

    try:
        with request.urlopen(
            http_request,
            timeout=(
                CONTROLLER_HTTP_TIMEOUT_SECONDS
            ),
        ) as response:
            status = response.status
            delivered = (
                200 <= status < 300
            )

            if not delivered:
                failure = (
                    "HTTP status %s"
                    % status
                )

    except error.HTTPError as exc:
        status = exc.code
        failure = (
            "HTTPError: %s"
            % exc.code
        )

    except error.URLError as exc:
        failure = (
            "URLError: %s"
            % exc.reason
        )

    except OSError as exc:
        failure = (
            "OSError: %s"
            % exc
        )

    note_session_activity("controller")

    if delivered:
        event_type = (
            "CONTROLLER_NOTIFICATION_DELIVERED"
        )

        suffix = "notification-delivered"

        event_data = {
            "lease_id": lease_id,
            "http_status": status,
        }

    else:
        event_type = (
            "CONTROLLER_NOTIFICATION_FAILED"
        )

        suffix = "notification-failed"

        event_data = {
            "lease_id": lease_id,
            "http_status": status,
            "error": failure,
        }

    journal_controller_event(
        item,
        event_type,
        controller_event_key(
            item,
            suffix,
            lease_id,
        ),
        event_data,
    )

    return {
        "delivered": delivered,
        "http_status": status,
        "error": failure,
    }


def remind_controller(item, age_seconds, last_state):
    """Relance le controleur sans modifier l'etat metier du mandat."""
    approval_id = item.get("approval_id", "")
    endpoint = controller_url() + "/validation/reminder"
    payload = json.dumps(
        {
            "event": "validation.reminder",
            "approval": item,
            "age_seconds": age_seconds,
            "last_state": last_state,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    bucket = int(time.time() // REMINDER_INTERVAL_SECONDS)
    journal.append_unique_event(
        event_type="CONTROLLER_REMINDER_ATTEMPTED",
        event_key="controller-reminder:%s:attempt:%s" % (approval_id, bucket),
        approval_id=approval_id,
        request_id=item.get("requestId", ""),
        change_id=item.get("change_id", ""),
        actor="BROKER",
        data={"endpoint": endpoint, "age_seconds": age_seconds, "last_state": last_state},
    )
    http_request = request.Request(
        endpoint,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with request.urlopen(http_request, timeout=CONTROLLER_HTTP_TIMEOUT_SECONDS) as response:
            delivered = 200 <= response.status < 300
            status = response.status
    except (error.HTTPError, error.URLError, OSError):
        delivered = False
        status = None
    journal.append_unique_event(
        event_type="CONTROLLER_REMINDER_DELIVERED" if delivered else "CONTROLLER_REMINDER_FAILED",
        event_key="controller-reminder:%s:%s:%s" % (approval_id, "delivered" if delivered else "failed", bucket),
        approval_id=approval_id,
        request_id=item.get("requestId", ""),
        change_id=item.get("change_id", ""),
        actor="BROKER",
        data={"http_status": status},
    )
    return delivered


def maybe_remind_controller(item, age_seconds, last_state):
    """Reserve atomiquement une relance de trente secondes pour un PENDING."""
    approval_id = item.get("approval_id", "")
    if not approval_id or item.get("notification_status") != "DELIVERED":
        return False
    now_ts = time.time()
    path = store_path()
    with locked_store(path):
        data = load_store(path)
        current = data["approvals"].get(approval_id)
        if current is None or current.get("status") != "PENDING":
            return False
        last_reminder = parse_utc(current.get("reminder_last_at", ""))
        if last_reminder is not None and now_ts - last_reminder < REMINDER_INTERVAL_SECONDS:
            return False
        current["reminder_last_at"] = utc_now()
        save_store(path, data)
        snapshot = dict(current)
    return remind_controller(snapshot, age_seconds, last_state)


def decision_fingerprint(decision):
    canonical = json.dumps(
        decision,
        ensure_ascii=False,
        sort_keys=True,
        separators=(
            ",",
            ":",
        ),
    ).encode(
        "utf-8"
    )

    return hashlib.sha256(
        canonical
    ).hexdigest()[:24]


def controller_decision(item):
    request_id = item.get(
        "requestId",
        "",
    )

    if not request_id:
        return None

    url = (
        controller_url()
        + "/decision/"
        + parse.quote(
            request_id,
            safe="",
        )
    )

    journal_controller_event(
        item,
        "CONTROLLER_DECISION_POLLING_STARTED",
        controller_event_key(
            item,
            "decision-polling-started",
            "initial",
        ),
        {
            "endpoint": url,
        },
    )

    status = None

    try:
        with request.urlopen(
            url,
            timeout=(
                CONTROLLER_HTTP_TIMEOUT_SECONDS
            ),
        ) as response:
            note_session_activity("controller")
            status = response.status

            if status == 204:
                journal_controller_event(
                    item,
                    "CONTROLLER_DECISION_NOT_AVAILABLE",
                    controller_event_key(
                        item,
                        "decision-not-available",
                        "first",
                    ),
                    {
                        "endpoint": url,
                        "http_status": status,
                    },
                )

                return None

            if status != 200:
                bucket = int(
                    time.time() // 60
                )

                journal_controller_event(
                    item,
                    "CONTROLLER_DECISION_HTTP_ERROR",
                    controller_event_key(
                        item,
                        "decision-http-error",
                        "%s-%s" % (
                            status,
                            bucket,
                        ),
                    ),
                    {
                        "endpoint": url,
                        "http_status": status,
                    },
                )

                return None

            raw_body = response.read()

    except error.HTTPError as exc:
        status = exc.code

        if status == 404:
            journal_controller_event(
                item,
                "CONTROLLER_DECISION_NOT_AVAILABLE",
                controller_event_key(
                    item,
                    "decision-not-available",
                    "first",
                ),
                {
                    "endpoint": url,
                    "http_status": status,
                },
            )

            return None

        bucket = int(
            time.time() // 60
        )

        journal_controller_event(
            item,
            "CONTROLLER_DECISION_HTTP_ERROR",
            controller_event_key(
                item,
                "decision-http-error",
                "%s-%s" % (
                    status,
                    bucket,
                ),
            ),
            {
                "endpoint": url,
                "http_status": status,
                "error": "HTTPError: %s" % status,
            },
        )

        return None

    except error.URLError as exc:
        failure = "URLError: %s" % exc.reason
        fingerprint = hashlib.sha256(
            failure.encode(
                "utf-8"
            )
        ).hexdigest()[:16]
        bucket = int(
            time.time() // 60
        )

        journal_controller_event(
            item,
            "CONTROLLER_DECISION_TRANSPORT_FAILED",
            controller_event_key(
                item,
                "decision-transport-failed",
                "%s-%s" % (
                    fingerprint,
                    bucket,
                ),
            ),
            {
                "endpoint": url,
                "error": failure,
            },
        )

        return None

    except OSError as exc:
        failure = "OSError: %s" % exc
        fingerprint = hashlib.sha256(
            failure.encode(
                "utf-8"
            )
        ).hexdigest()[:16]
        bucket = int(
            time.time() // 60
        )

        journal_controller_event(
            item,
            "CONTROLLER_DECISION_TRANSPORT_FAILED",
            controller_event_key(
                item,
                "decision-transport-failed",
                "%s-%s" % (
                    fingerprint,
                    bucket,
                ),
            ),
            {
                "endpoint": url,
                "error": failure,
            },
        )

        return None

    if not raw_body:
        fingerprint = "empty-body"

        journal_controller_event(
            item,
            "CONTROLLER_DECISION_INVALID_RESPONSE",
            controller_event_key(
                item,
                "decision-invalid-response",
                fingerprint,
            ),
            {
                "endpoint": url,
                "http_status": status,
                "reason": "reponse vide",
            },
        )

        return None

    try:
        payload = json.loads(
            raw_body.decode(
                "utf-8"
            )
        )

    except (
        UnicodeDecodeError,
        json.JSONDecodeError,
    ) as exc:
        fingerprint = hashlib.sha256(
            raw_body
        ).hexdigest()[:24]

        journal_controller_event(
            item,
            "CONTROLLER_DECISION_INVALID_RESPONSE",
            controller_event_key(
                item,
                "decision-invalid-response",
                fingerprint,
            ),
            {
                "endpoint": url,
                "http_status": status,
                "reason": str(exc),
                "fingerprint": fingerprint,
            },
        )

        return None

    if not isinstance(
        payload,
        dict,
    ):
        fingerprint = decision_fingerprint(
            {
                "payload": payload,
            }
        )

        journal_controller_event(
            item,
            "CONTROLLER_DECISION_INVALID_RESPONSE",
            controller_event_key(
                item,
                "decision-invalid-response",
                fingerprint,
            ),
            {
                "endpoint": url,
                "http_status": status,
                "reason": "objet JSON attendu",
                "fingerprint": fingerprint,
            },
        )

        return None

    if payload.get(
        "decision"
    ) not in (
        "approved",
        "rejected",
        "needs_clarification",
    ):
        fingerprint = decision_fingerprint(
            payload
        )

        journal_controller_event(
            item,
            "CONTROLLER_DECISION_INVALID_RESPONSE",
            controller_event_key(
                item,
                "decision-invalid-response",
                fingerprint,
            ),
            {
                "endpoint": url,
                "http_status": status,
                "reason": "decision absente ou invalide",
                "fingerprint": fingerprint,
            },
        )

        return None

    fingerprint = decision_fingerprint(
        payload
    )

    journal_controller_event(
        item,
        "CONTROLLER_DECISION_RECEIVED",
        controller_event_key(
            item,
            "decision-received",
            fingerprint,
        ),
        {
            "decision_id": payload.get(
                "decision_id",
                "",
            ),
            "decision": payload.get(
                "decision",
                "",
            ),
            "reviewer": payload.get(
                "reviewer",
                "",
            ),
            "fingerprint": fingerprint,
            "http_status": status,
        },
    )

    if not validate_controller_decision(
        item,
        payload,
    ):
        journal_controller_event(
            item,
            (
                "CONTROLLER_DECISION_"
                "REJECTED_CORRELATION"
            ),
            controller_event_key(
                item,
                "decision-rejected-correlation",
                fingerprint,
            ),
            {
                "decision_id": payload.get(
                    "decision_id",
                    "",
                ),
                "decision": payload.get(
                    "decision",
                    "",
                ),
                "returned_approval_id": payload.get(
                    "approval_id",
                    "",
                ),
                "returned_requestId": payload.get(
                    "requestId",
                    "",
                ),
                "returned_change_id": payload.get(
                    "change_id",
                    "",
                ),
                "expected_approval_id": item.get(
                    "approval_id",
                    "",
                ),
                "expected_requestId": item.get(
                    "requestId",
                    "",
                ),
                "expected_change_id": item.get(
                    "change_id",
                    "",
                ),
                "fingerprint": fingerprint,
            },
        )

        return None

    return payload

def validate_controller_decision(
    item,
    decision,
):
    if not isinstance(
        decision,
        dict,
    ):
        return False

    approval_id = item.get(
        "approval_id"
    )

    request_id = item.get(
        "requestId"
    )

    change_id = item.get(
        "change_id"
    )

    decision_approval_id = decision.get(
        "approval_id"
    )

    decision_request_id = decision.get(
        "requestId"
    )

    decision_change_id = decision.get(
        "change_id"
    )

    if (
        not isinstance(
            approval_id,
            str,
        )
        or not approval_id
        or not isinstance(
            request_id,
            str,
        )
        or not request_id
        or not isinstance(
            change_id,
            str,
        )
        or not change_id
    ):
        return False

    if (
        decision_approval_id
        != approval_id
        or decision_request_id
        != request_id
        or decision_change_id
        != change_id
    ):
        return False

    return True


def notification_retry_delay(
    attempts,
):
    if attempts < 1:
        attempts = 1

    delay = (
        NOTIFICATION_RETRY_INITIAL_SECONDS
        * (
            2
            ** (
                attempts - 1
            )
        )
    )

    return min(
        delay,
        NOTIFICATION_RETRY_MAX_SECONDS,
    )


def notification_lease_active(item):
    if item.get(
        "notification_status"
    ) != "SENDING":
        return False

    lease_until = parse_utc(
        item.get(
            "notification_lease_until"
        )
    )

    if lease_until is None:
        return False

    return (
        time.time()
        < lease_until
    )


def notification_retry_due(item):
    if item.get(
        "notification_status"
    ) == "DELIVERED":
        return False

    if notification_lease_active(
        item
    ):
        return False

    retry_at = parse_utc(
        item.get(
            "notification_next_retry_at"
        )
    )

    if retry_at is None:
        return True

    return (
        time.time()
        >= retry_at
    )


def acquire_notification_lease(
    approval_id,
):
    path = store_path()

    with locked_store(
        path
    ):
        data = load_store(
            path
        )

        item = data[
            "approvals"
        ].get(
            approval_id
        )

        if item is None:
            return None

        expired = check_expired(
            item
        )

        if expired:
            save_store(
                path,
                data,
            )

            repair_journal_for_item(
                item
            )

            return None

        if item.get(
            "status"
        ) != "PENDING":
            repair_journal_for_item(
                item
            )

            return None

        if not notification_retry_due(
            item
        ):
            return None

        lease_id = uuid.uuid4().hex

        item[
            "notification_status"
        ] = "SENDING"

        item[
            "notification_lease_id"
        ] = lease_id

        item[
            "notification_lease_until"
        ] = utc_from_timestamp(
            time.time()
            + NOTIFICATION_LEASE_SECONDS
        )

        item[
            "notification_updated_at"
        ] = utc_now()

        save_store(
            path,
            data,
        )

        return {
            "lease_id": lease_id,
            "approval": dict(
                item
            ),
        }


def complete_notification_lease(
    approval_id,
    lease_id,
    delivered,
):
    path = store_path()

    with locked_store(
        path
    ):
        data = load_store(
            path
        )

        item = data[
            "approvals"
        ].get(
            approval_id
        )

        if item is None:
            return

        if item.get(
            "notification_lease_id"
        ) != lease_id:
            return

        attempts = item.get(
            "notification_attempts",
            0,
        )

        if (
            not isinstance(
                attempts,
                int,
            )
            or isinstance(
                attempts,
                bool,
            )
        ):
            attempts = 0

        attempts += 1

        item[
            "notification_attempts"
        ] = attempts

        item[
            "notification_updated_at"
        ] = utc_now()

        item[
            "notification_lease_id"
        ] = ""

        item[
            "notification_lease_until"
        ] = ""

        if delivered:
            item[
                "notification_status"
            ] = "DELIVERED"

            item[
                "notification_next_retry_at"
            ] = ""

        else:
            item[
                "notification_status"
            ] = "FAILED"

            item[
                "notification_next_retry_at"
            ] = utc_from_timestamp(
                time.time()
                + notification_retry_delay(
                    attempts
                )
            )

        save_store(
            path,
            data,
        )


def maybe_notify_controller(item):
    approval_id = item.get(
        "approval_id"
    )

    if not approval_id:
        return False

    lease = acquire_notification_lease(
        approval_id
    )

    if lease is None:
        return False

    notification_result = notify_controller(
        lease[
            "approval"
        ],
        lease[
            "lease_id"
        ],
    )

    delivered = notification_result.get(
        "delivered",
        False,
    )

    complete_notification_lease(
        approval_id,
        lease[
            "lease_id"
        ],
        delivered,
    )

    return delivered


def require_str(
    args,
    name,
    max_len=500,
):
    value = args.get(
        name
    )

    if (
        not isinstance(
            value,
            str,
        )
        or not value.strip()
    ):
        raise ValidationError(
            "parametre '%s' obligatoire et non vide"
            % name
        )

    if len(
        value
    ) > max_len:
        raise ValidationError(
            "parametre '%s' trop long (max %d)"
            % (
                name,
                max_len,
            )
        )

    return value.strip()


def optional_str(
    args,
    name,
    max_len=500,
):
    value = args.get(
        name,
        "",
    )

    if value in (
        None,
        "",
    ):
        return ""

    if not isinstance(
        value,
        str,
    ):
        raise ValidationError(
            "parametre '%s' : chaine attendue"
            % name
        )

    value = value.strip()

    if len(
        value
    ) > max_len:
        raise ValidationError(
            "parametre '%s' trop long (max %d)"
            % (
                name,
                max_len,
            )
        )

    return value


def require_list_str(
    args,
    name,
    max_items=50,
    allow_empty=False,
):
    value = args.get(
        name
    )

    if (
        not isinstance(
            value,
            list,
        )
        or (
            not allow_empty
            and not value
        )
    ):
        raise ValidationError(
            "parametre '%s' : liste non vide obligatoire"
            % name
        )

    if len(
        value
    ) > max_items:
        raise ValidationError(
            "parametre '%s' : trop d elements"
            % name
        )

    result = []

    for entry in value:
        if (
            not isinstance(
                entry,
                str,
            )
            or not entry.strip()
        ):
            raise ValidationError(
                "parametre '%s' : entree vide interdite"
                % name
            )

        result.append(
            entry.strip()
        )

    return result


def validate_unitary_operation(
    args,
):
    operation_args = dict(
        args
    )
    operation_args.setdefault(
        "commands",
        [],
    )

    files = require_list_str(
        operation_args,
        "files",
        max_items=1,
        allow_empty=True,
    )

    commands = require_list_str(
        operation_args,
        "commands",
        max_items=1,
        allow_empty=True,
    )

    if (
        len(files) != 1
        and len(commands) != 1
    ) or (
        files
        and commands
    ):
        raise ValidationError(
            "un mandat doit contenir un fichier ou une commande unique"
        )

    return files, commands


def validate_wait_parameters(
    args,
    default_timeout,
    allow_no_timeout=False,
):
    timeout_seconds = args.get(
        "timeout_seconds",
        default_timeout,
    )

    interval_seconds = args.get(
        "interval_seconds",
        DEFAULT_POLL_INTERVAL_SECONDS,
    )

    if (
        not isinstance(
            timeout_seconds,
            int,
        )
        or isinstance(
            timeout_seconds,
            bool,
        )
    ):
        raise ValidationError(
            "parametre 'timeout_seconds' : entier attendu"
        )

    if allow_no_timeout:
        if (
            timeout_seconds < 0
            or timeout_seconds > 86400
        ):
            raise ValidationError(
                "parametre 'timeout_seconds' : "
                "entier entre 0 et 86400"
            )

    else:
        if (
            timeout_seconds < 1
            or timeout_seconds > 3600
        ):
            raise ValidationError(
                "parametre 'timeout_seconds' : "
                "entier entre 1 et 3600"
            )

    if (
        not isinstance(
            interval_seconds,
            int,
        )
        or isinstance(
            interval_seconds,
            bool,
        )
        or interval_seconds < 1
        or interval_seconds > 60
    ):
        raise ValidationError(
            "parametre 'interval_seconds' : "
            "entier entre 1 et 60"
        )

    return (
        timeout_seconds,
        interval_seconds,
    )


def apply_controller_decision(
    item,
    decision,
):
    if not validate_controller_decision(
        item,
        decision,
    ):
        return False

    decision_value = decision.get(
        "decision"
    )

    if decision_value == "approved":
        status = "APPROVED"

    elif decision_value == "rejected":
        status = "REJECTED"

    elif decision_value == "needs_clarification":
        status = "NEEDS_CLARIFICATION"

    else:
        return False

    now = utc_now()

    item[
        "status"
    ] = status

    item[
        "reviewer"
    ] = decision.get(
        "reviewer",
        "CGPT",
    )

    item[
        "comment"
    ] = decision.get(
        "comment",
        "",
    )

    item[
        "updated_at"
    ] = now

    item[
        "decision_applied_at"
    ] = now

    decision_id = decision.get(
        "decision_id"
    )

    if isinstance(
        decision_id,
        str,
    ):
        item[
            "decision_id"
        ] = decision_id

    return True


def validate_existing_approval(
    item,
    change_id,
    title,
    files,
    request_id,
    session_id,
    directory,
    commands,
):
    if item.get(
        "change_id"
    ) != change_id:
        return False

    if item.get(
        "title"
    ) != title:
        return False

    if item.get(
        "files"
    ) != files:
        return False

    if item.get("session_id", "") != session_id:
        return False

    if item.get("directory", "") != directory:
        return False

    if item.get("commands", []) != commands:
        return False

    if (
        request_id
        and not request_id_matches_item(
            item,
            request_id,
        )
    ):
        return False

    return True


def do_propose(args):
    change_id = require_str(
        args,
        "change_id",
        200,
    )

    title = require_str(
        args,
        "title",
        300,
    )

    files, commands = validate_unitary_operation(
        args,
    )

    summary = optional_str(
        args,
        "summary",
        2000,
    )

    approval_id = optional_str(
        args,
        "approval_id",
        100,
    )

    request_id = optional_str(
        args,
        "requestId",
        100,
    )

    session_id = optional_str(
        args,
        "session_id",
        200,
    )

    directory = optional_str(
        args,
        "directory",
        500,
    )

    if bool(session_id) != bool(directory):
        raise ValidationError(
            "session_id et directory doivent etre fournis ensemble"
        )

    if session_id:
        if not session_id.startswith("ses_"):
            raise ValidationError("parametre 'session_id' invalide")

        if not directory.startswith("/"):
            raise ValidationError("parametre 'directory' invalide")

        if any(
            path.startswith("/")
            or path == ".."
            or path.startswith("../")
            for path in files
        ):
            raise ValidationError(
                "files doit contenir des chemins relatifs sans remontee"
            )

    ttl = args.get(
        "ttl_seconds",
        DEFAULT_TTL_SECONDS,
    )

    if (
        not isinstance(
            ttl,
            int,
        )
        or isinstance(
            ttl,
            bool,
        )
        or ttl < 60
        or ttl > 604800
    ):
        raise ValidationError(
            "parametre 'ttl_seconds' : "
            "entier entre 60 et 604800"
        )

    path = store_path()
    should_notify = False

    with locked_store(
        path
    ):
        data = load_store(
            path
        )

        approvals = data[
            "approvals"
        ]

        unique, duplicate = (
            check_request_id_uniqueness(
                approvals
            )
        )

        if not unique:
            raise StoreError(
                "requestId duplique : %s"
                % duplicate
            )

        existing = None

        if approval_id:
            existing = approvals.get(
                approval_id
            )

        if (
            existing is None
            and request_id
        ):
            request_match = find_by_request_id(
                approvals,
                request_id,
            )

            if request_match is not None:
                if (
                    approval_id
                    and request_match.get(
                        "approval_id"
                    )
                    != approval_id
                ):
                    raise ValidationError(
                        "requestId '%s' appartient deja "
                        "a approval_id '%s'"
                        % (
                            request_id,
                            request_match.get(
                                "approval_id"
                            ),
                        )
                    )

                existing = request_match

                approval_id = existing.get(
                    "approval_id"
                )

        if existing is not None:
            expired = check_expired(
                existing
            )

            if expired:
                save_store(
                    path,
                    data,
                )

            repair_journal_for_item(
                existing
            )

            if not validate_existing_approval(
                existing,
                change_id,
                title,
                files,
                request_id,
                session_id,
                directory,
                commands,
            ):
                raise ValidationError(
                    "retry incompatible avec "
                    "l'approbation '%s'"
                    % existing.get(
                        "approval_id"
                    )
                )

            should_notify = (
                existing.get(
                    "status"
                )
                == "PENDING"
                and notification_retry_due(
                    existing
                )
            )

            result = dict(
                existing
            )

        else:
            if not request_id:
                request_id = (
                    new_business_request_id()
                )

            while (
                find_by_request_id(
                    approvals,
                    request_id,
                )
                is not None
            ):
                request_id = (
                    new_business_request_id()
                )

            if not approval_id:
                approval_id = (
                    new_approval_id()
                )

                while approval_id in approvals:
                    approval_id = (
                        new_approval_id()
                    )

            elif approval_id in approvals:
                raise ValidationError(
                    "approval_id '%s' deja utilise"
                    % approval_id
                )

            now = utc_now()

            item = {
                "approval_id": approval_id,
                "requestId": request_id,
                "legacy_requestIds": [],
                "change_id": change_id,
                "title": title,
                "files": files,
                "session_id": session_id,
                "directory": directory,
                "commands": commands,
                "summary": summary,
                "status": "PENDING",
                "requester": "OC",
                "reviewer": "",
                "comment": "",
                "created_at": now,
                "updated_at": now,
                "expires_at": (
                    utc_from_timestamp(
                        time.time()
                        + ttl
                    )
                ),
                "notification_status": "PENDING",
                "notification_attempts": 0,
                "notification_updated_at": "",
                "notification_next_retry_at": "",
                "notification_lease_id": "",
                "notification_lease_until": "",
                "reminder_last_at": "",
                "decision_id": "",
                "decision_applied_at": "",
                "cancelled_at": "",
                "cancelled_by": "",
                "expired_at": "",
            }

            approvals[
                approval_id
            ] = item

            save_store(
                path,
                data,
            )

            ensure_created_event(
                item
            )

            result = dict(
                item
            )

            should_notify = True

    if should_notify:
        maybe_notify_controller(
            result
        )

        with locked_store(
            path
        ):
            data = load_store(
                path
            )

            current = data[
                "approvals"
            ].get(
                approval_id
            )

            if current is not None:
                result = dict(
                    current
                )

    return result


def do_get(args):
    approval_id = optional_str(
        args,
        "approval_id",
        100,
    )

    path = store_path()

    should_notify = False
    should_check_decision = False

    with locked_store(
        path
    ):
        data = load_store(
            path
        )

        item = data[
            "approvals"
        ].get(
            approval_id
        )

        if item is None:
            raise ValidationError(
                "approval_id '%s' inconnu"
                % approval_id
            )

        expired = check_expired(
            item
        )

        if expired:
            save_store(
                path,
                data,
            )

        repair_journal_for_item(
            item
        )

        if item.get(
            "status"
        ) == "PENDING":
            should_check_decision = True

            should_notify = (
                notification_retry_due(
                    item
                )
            )

        snapshot = dict(
            item
        )

    if should_notify:
        maybe_notify_controller(
            snapshot
        )

    decision = None

    if should_check_decision:
        decision = controller_decision(
            snapshot
        )

    with locked_store(
        path
    ):
        data = load_store(
            path
        )

        item = data[
            "approvals"
        ].get(
            approval_id
        )

        if item is None:
            raise ValidationError(
                "approval_id '%s' inconnu"
                % approval_id
            )

        changed = check_expired(
            item
        )

        if (
            decision is not None
            and item.get(
                "status"
            )
            == "PENDING"
        ):
            if apply_controller_decision(
                item,
                decision,
            ):
                changed = True

        if changed:
            save_store(
                path,
                data,
            )

        repair_journal_for_item(
            item
        )

        return dict(
            item
        )


def wait_for_approval(
    approval_id,
    timeout_seconds,
    interval_seconds,
    timeout_kind,
    cancel_event=None,
):
    deadline = None

    if timeout_seconds > 0:
        deadline = (
            time.monotonic()
            + timeout_seconds
        )

    while True:
        if (
            cancel_event is not None
            and cancel_event.is_set()
        ):
            raise RequestCancelled()

        item = do_get(
            {
                "approval_id": approval_id,
            }
        )

        if item.get(
            "status"
        ) in TERMINAL_STATES:
            return item

        if (
            deadline is not None
            and time.monotonic()
            >= deadline
        ):
            result = dict(
                item
            )

            result[
                timeout_kind
            ] = True

            result[
                "retry_required"
            ] = True

            result[
                "next_action"
            ] = "poll_approval"

            result[
                "retry_approval_id"
            ] = approval_id

            return result

        if cancel_event is not None:
            if cancel_event.wait(
                interval_seconds
            ):
                raise RequestCancelled()

        else:
            time.sleep(
                interval_seconds
            )


def do_poll(
    args,
    cancel_event=None,
):
    approval_id = require_str(
        args,
        "approval_id",
        100,
    )

    (
        timeout_seconds,
        interval_seconds,
    ) = validate_wait_parameters(
        args,
        DEFAULT_POLL_TIMEOUT_SECONDS,
        allow_no_timeout=False,
    )

    return wait_for_approval(
        approval_id,
        timeout_seconds,
        interval_seconds,
        "poll_timeout",
        cancel_event=cancel_event,
    )


def do_request_validation(
    args,
    cancel_event=None,
):
    (
        timeout_seconds,
        interval_seconds,
    ) = validate_wait_parameters(
        args,
        DEFAULT_REQUEST_TIMEOUT_SECONDS,
        allow_no_timeout=True,
    )

    item = do_propose(
        args
    )

    if item.get(
        "status"
    ) in TERMINAL_STATES:
        return item

    return wait_for_approval(
        item[
            "approval_id"
        ],
        timeout_seconds,
        interval_seconds,
        "validation_timeout",
        cancel_event=cancel_event,
    )


def do_list(args):
    status = args.get(
        "status",
        "",
    )

    if (
        status
        and status not in VALID_STATES
    ):
        raise ValidationError(
            "status inconnu, attendu parmi %s"
            % ",".join(
                VALID_STATES
            )
        )

    limit = args.get(
        "limit",
        50,
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
        or limit < 1
        or limit > 200
    ):
        raise ValidationError(
            "parametre 'limit' : "
            "entier entre 1 et 200"
        )

    path = store_path()

    with locked_store(
        path
    ):
        data = load_store(
            path
        )

        changed = False

        for item in data[
            "approvals"
        ].values():
            if check_expired(
                item
            ):
                changed = True

        #
        # Important :
        # toutes les expirations sont persistantes
        # AVANT leur journalisation.
        #
        if changed:
            save_store(
                path,
                data,
            )

        items = []

        for item in data[
            "approvals"
        ].values():
            repair_journal_for_item(
                item
            )

            if (
                not status
                or item.get(
                    "status"
                )
                == status
            ):
                items.append(
                    dict(
                        item
                    )
                )

    items.sort(
        key=lambda value: value.get(
            "created_at",
            "",
        )
    )

    return {
        "approvals": items[:limit],
        "count": len(
            items
        ),
    }


def do_decide(
    args,
    decision,
):
    approval_id = require_str(
        args,
        "approval_id",
        100,
    )

    reviewer = require_str(
        args,
        "reviewer",
        100,
    )

    comment = optional_str(
        args,
        "comment",
        2000,
    )

    path = store_path()

    with locked_store(
        path
    ):
        data = load_store(
            path
        )

        item = data[
            "approvals"
        ].get(
            approval_id
        )

        if item is None:
            raise ValidationError(
                "approval_id '%s' inconnu"
                % approval_id
            )

        expired = check_expired(
            item
        )

        if expired:
            save_store(
                path,
                data,
            )

            repair_journal_for_item(
                item
            )

        if item.get(
            "status"
        ) not in DECIDABLE:
            if item.get(
                "status"
            ) == decision:
                repair_journal_for_item(
                    item
                )

                return dict(
                    item
                )

            raise ValidationError(
                "decision refusee : "
                "statut '%s' non decidable"
                % item.get(
                    "status"
                )
            )

        now = utc_now()

        item[
            "status"
        ] = decision

        item[
            "reviewer"
        ] = reviewer

        item[
            "comment"
        ] = comment

        item[
            "updated_at"
        ] = now

        item[
            "decision_applied_at"
        ] = now

        save_store(
            path,
            data,
        )

        repair_journal_for_item(
            item
        )

        return dict(
            item
        )


def do_cancel(args):
    approval_id = require_str(
        args,
        "approval_id",
        100,
    )

    path = store_path()

    with locked_store(
        path
    ):
        data = load_store(
            path
        )

        item = data[
            "approvals"
        ].get(
            approval_id
        )

        if item is None:
            raise ValidationError(
                "approval_id '%s' inconnu"
                % approval_id
            )

        expired = check_expired(
            item
        )

        if expired:
            save_store(
                path,
                data,
            )

            repair_journal_for_item(
                item
            )

        if item.get(
            "status"
        ) == "CANCELLED":
            repair_journal_for_item(
                item
            )

            return dict(
                item
            )

        if item.get(
            "status"
        ) not in DECIDABLE:
            raise ValidationError(
                "annulation refusee : "
                "statut '%s' non annulable"
                % item.get(
                    "status"
                )
            )

        now = utc_now()

        item[
            "status"
        ] = "CANCELLED"

        item[
            "updated_at"
        ] = now

        item[
            "cancelled_at"
        ] = now

        item[
            "cancelled_by"
        ] = "OC"

        save_store(
            path,
            data,
        )

        repair_journal_for_item(
            item
        )

        return dict(
            item
        )


def control_increment():
    global CONTROL_INFLIGHT

    with CONTROL_STATE_LOCK:
        CONTROL_INFLIGHT += 1


def control_decrement():
    global CONTROL_INFLIGHT

    with CONTROL_STATE_LOCK:
        if CONTROL_INFLIGHT > 0:
            CONTROL_INFLIGHT -= 1


def fast_increment():
    global FAST_INFLIGHT

    with FAST_STATE_LOCK:
        FAST_INFLIGHT += 1


def fast_decrement():
    global FAST_INFLIGHT

    with FAST_STATE_LOCK:
        if FAST_INFLIGHT > 0:
            FAST_INFLIGHT -= 1


def blocking_increment():
    global BLOCKING_INFLIGHT

    with BLOCKING_STATE_LOCK:
        BLOCKING_INFLIGHT += 1


def blocking_decrement():
    global BLOCKING_INFLIGHT

    with BLOCKING_STATE_LOCK:
        if BLOCKING_INFLIGHT > 0:
            BLOCKING_INFLIGHT -= 1


def control_snapshot():
    with CONTROL_STATE_LOCK:
        inflight = CONTROL_INFLIGHT

    return {
        "inflight": inflight,
        "capacity": MAX_CONTROL_CAPACITY,
        "capacity_remaining": max(
            0,
            MAX_CONTROL_CAPACITY
            - inflight,
        ),
        "workers": MAX_CONTROL_WORKERS,
        "queue_capacity": MAX_CONTROL_QUEUE,
    }


def fast_snapshot():
    with FAST_STATE_LOCK:
        inflight = FAST_INFLIGHT

    return {
        "inflight": inflight,
        "capacity": MAX_FAST_CAPACITY,
        "capacity_remaining": max(
            0,
            MAX_FAST_CAPACITY
            - inflight,
        ),
        "workers": MAX_FAST_WORKERS,
        "queue_capacity": MAX_FAST_QUEUE,
    }


def blocking_snapshot():
    with BLOCKING_STATE_LOCK:
        inflight = BLOCKING_INFLIGHT

    return {
        "inflight": inflight,
        "capacity": MAX_BLOCKING_CAPACITY,
        "capacity_remaining": max(
            0,
            MAX_BLOCKING_CAPACITY
            - inflight,
        ),
        "workers": MAX_BLOCKING_WORKERS,
        "queue_capacity": MAX_BLOCKING_QUEUE,
    }


def active_requests_count():
    with ACTIVE_REQUESTS_LOCK:
        return len(
            ACTIVE_REQUESTS
        )


def reconciliation_snapshot():
    with RECONCILIATION_LOCK:
        return {
            "state": (
                "RUNNING"
                if RECONCILIATION_RUNNING
                else "IDLE"
            ),
            "last_started_at": (
                RECONCILIATION_LAST_STARTED_AT
            ),
            "last_finished_at": (
                RECONCILIATION_LAST_FINISHED_AT
            ),
            "last_error": (
                RECONCILIATION_LAST_ERROR
            ),
        }


def store_health_snapshot():
    path = store_path()

    try:
        with locked_store(
            path
        ):
            data = load_store(
                path
            )

            approvals = data[
                "approvals"
            ]

            total = len(
                approvals
            )

            pending = sum(
                1
                for item in approvals.values()
                if item.get(
                    "status"
                )
                == "PENDING"
            )

            terminal = sum(
                1
                for item in approvals.values()
                if item.get(
                    "status"
                )
                in TERMINAL_STATES
            )

            unique, duplicate = (
                check_request_id_uniqueness(
                    approvals
                )
            )

        return {
            "ok": unique,
            "path": path,
            "schema_version": data.get(
                "schema_version"
            ),
            "expected_schema_version": (
                STORE_SCHEMA_VERSION
            ),
            "durable_write": True,
            "total_approvals": total,
            "pending_approvals": pending,
            "terminal_approvals": terminal,
            "request_id_collision": (
                not unique
            ),
            "duplicate_request_id": duplicate,
            "error": (
                ""
                if unique
                else "requestId duplique"
            ),
        }

    except StoreError as exc:
        return {
            "ok": False,
            "path": path,
            "schema_version": None,
            "expected_schema_version": (
                STORE_SCHEMA_VERSION
            ),
            "durable_write": True,
            "total_approvals": None,
            "pending_approvals": None,
            "terminal_approvals": None,
            "request_id_collision": None,
            "duplicate_request_id": "",
            "error": str(
                exc
            ),
        }


def store_journal_consistency_snapshot():
    """Compare approvals.json et events.ndjson sans modifier aucun etat."""
    path = store_path()

    try:
        with locked_store(path):
            data = load_store(path)
            approvals = {
                approval_id: dict(item)
                for approval_id, item in data["approvals"].items()
            }

        events = journal.read_events()

    except (StoreError, journal.JournalError, journal.JournalValidationError) as exc:
        return {
            "ok": False,
            "checked_approvals": None,
            "checked_events": None,
            "missing_created_events": [],
            "missing_terminal_events": [],
            "pending_with_terminal_event": [],
            "terminal_status_mismatches": [],
            "multiple_terminal_events": [],
            "orphan_journal_approvals": [],
            "error": str(exc),
        }

    events_by_approval = {}

    for event in events:
        approval_id = event.get("approval_id", "")

        if not approval_id:
            continue

        events_by_approval.setdefault(
            approval_id,
            [],
        ).append(event)

    terminal_by_event = {
        "APPROVAL_APPROVED": "APPROVED",
        "APPROVAL_REJECTED": "REJECTED",
        "APPROVAL_NEEDS_CLARIFICATION": "NEEDS_CLARIFICATION",
        "APPROVAL_CANCELLED": "CANCELLED",
        "APPROVAL_EXPIRED": "EXPIRED",
    }

    missing_created = []
    missing_terminal = []
    pending_with_terminal = []
    terminal_mismatches = []
    multiple_terminal = []

    for approval_id, item in approvals.items():
        approval_events = events_by_approval.get(
            approval_id,
            [],
        )

        created_events = [
            event
            for event in approval_events
            if event.get("event_type") == "APPROVAL_CREATED"
        ]

        terminal_events = [
            event
            for event in approval_events
            if event.get("event_type") in terminal_by_event
        ]

        if not created_events:
            missing_created.append(approval_id)

        status = item.get("status")

        if status in TERMINAL_STATES:
            matching = [
                event
                for event in terminal_events
                if terminal_by_event.get(event.get("event_type")) == status
            ]

            if not matching:
                missing_terminal.append(approval_id)

            if terminal_events:
                last_terminal = terminal_events[-1]
                journal_status = terminal_by_event.get(
                    last_terminal.get("event_type")
                )

                if journal_status != status:
                    terminal_mismatches.append(
                        {
                            "approval_id": approval_id,
                            "store_status": status,
                            "journal_status": journal_status,
                            "journal_event_id": last_terminal.get(
                                "event_id",
                                "",
                            ),
                        }
                    )

        elif status == "PENDING" and terminal_events:
            last_terminal = terminal_events[-1]
            pending_with_terminal.append(
                {
                    "approval_id": approval_id,
                    "journal_status": terminal_by_event.get(
                        last_terminal.get("event_type")
                    ),
                    "journal_event_id": last_terminal.get(
                        "event_id",
                        "",
                    ),
                }
            )

        terminal_statuses = [
            terminal_by_event.get(event.get("event_type"))
            for event in terminal_events
        ]

        distinct_terminal_statuses = sorted(
            {
                value
                for value in terminal_statuses
                if value is not None
            }
        )

        if len(distinct_terminal_statuses) > 1:
            multiple_terminal.append(
                {
                    "approval_id": approval_id,
                    "statuses": distinct_terminal_statuses,
                }
            )

    orphan_journal = sorted(
        approval_id
        for approval_id in events_by_approval
        if approval_id not in approvals
    )

    ok = not any(
        (
            missing_created,
            missing_terminal,
            pending_with_terminal,
            terminal_mismatches,
            multiple_terminal,
            orphan_journal,
        )
    )

    return {
        "ok": ok,
        "checked_approvals": len(approvals),
        "checked_events": len(events),
        "missing_created_events": missing_created,
        "missing_terminal_events": missing_terminal,
        "pending_with_terminal_event": pending_with_terminal,
        "terminal_status_mismatches": terminal_mismatches,
        "multiple_terminal_events": multiple_terminal,
        "orphan_journal_approvals": orphan_journal,
        "error": "" if ok else "divergence magasin/journal detectee",
    }



def repairable_consistency_ids(consistency):
    """Classe les divergences reparables et bloque les cas ambigus."""
    dangerous = set()

    for entry in consistency.get(
        "pending_with_terminal_event",
        [],
    ):
        if isinstance(entry, dict):
            approval_id = entry.get("approval_id")
            if approval_id:
                dangerous.add(approval_id)

    for entry in consistency.get(
        "terminal_status_mismatches",
        [],
    ):
        if isinstance(entry, dict):
            approval_id = entry.get("approval_id")
            if approval_id:
                dangerous.add(approval_id)

    for entry in consistency.get(
        "multiple_terminal_events",
        [],
    ):
        if isinstance(entry, dict):
            approval_id = entry.get("approval_id")
            if approval_id:
                dangerous.add(approval_id)

    candidates = set(
        consistency.get("missing_created_events", [])
    )
    candidates.update(
        consistency.get("missing_terminal_events", [])
    )

    repairable = sorted(
        approval_id
        for approval_id in candidates
        if approval_id not in dangerous
    )

    return repairable, sorted(dangerous)


def journal_consistency_repair_event(
    repair_id,
    event_type,
    phase,
    data=None,
    approval_id="",
):
    """Journalise une etape de reparation de coherence.

    Chaque evenement porte une cle d'idempotence derivee du repair_id.
    Une relance du meme appel interne ne duplique donc pas la meme etape.
    """
    event_key = "consistency-repair:%s:%s" % (
        repair_id,
        phase,
    )

    if approval_id:
        event_key += ":%s" % approval_id

    return journal.append_unique_event(
        event_type=event_type,
        event_key=event_key,
        approval_id=approval_id,
        actor="BROKER",
        data=data or {},
    )


def do_repair_consistency():
    """Repare uniquement les divergences magasin/journal non ambigues.

    Le magasin approvals.json reste l'autorite pour les cas reparables :
      - APPROVAL_CREATED manquant ;
      - evenement terminal manquant.

    Aucun changement n'est effectue lorsque le journal contredit le magasin.
    Toutes les etapes de cette tentative de reparation sont journalisees.
    """
    before = store_journal_consistency_snapshot()

    if before.get("checked_approvals") is None:
        raise StoreError(
            "controle de coherence impossible : %s"
            % before.get("error", "erreur inconnue")
        )

    repairable, dangerous = repairable_consistency_ids(
        before
    )

    repair_id = "repair-" + uuid.uuid4().hex[:16]

    journal_consistency_repair_event(
        repair_id,
        "CONSISTENCY_REPAIR_STARTED",
        "started",
        {
            "repairable_approvals": repairable,
            "blocked_approvals": dangerous,
            "orphan_journal_approvals": before.get(
                "orphan_journal_approvals",
                [],
            ),
            "before_ok": before.get("ok", False),
        },
    )

    path = store_path()
    repaired = []
    skipped_missing = []

    if repairable:
        with locked_store(path):
            data = load_store(path)
            approvals = data["approvals"]

            for approval_id in repairable:
                item = approvals.get(approval_id)

                if item is None:
                    skipped_missing.append(approval_id)
                    continue

                repair_journal_for_item(item)
                repaired.append(approval_id)

                journal_consistency_repair_event(
                    repair_id,
                    "CONSISTENCY_REPAIR_APPLIED",
                    "applied",
                    {
                        "status": item.get("status", ""),
                    },
                    approval_id=approval_id,
                )

    blocked_orphans = before.get(
        "orphan_journal_approvals",
        [],
    )

    if dangerous or blocked_orphans or skipped_missing:
        journal_consistency_repair_event(
            repair_id,
            "CONSISTENCY_REPAIR_BLOCKED",
            "blocked",
            {
                "blocked_approvals": dangerous,
                "orphan_journal_approvals": blocked_orphans,
                "missing_store_approvals": skipped_missing,
                "reason": (
                    "divergence ambigue ou non reparable automatiquement"
                ),
            },
        )

    after = store_journal_consistency_snapshot()

    status = (
        "REPAIRED"
        if repaired and after.get("ok")
        else (
            "PARTIAL"
            if repaired
            else (
                "NO_ACTION"
                if before.get("ok")
                else "HUMAN_REQUIRED"
            )
        )
    )

    human_required = not after.get("ok", False)

    journal_consistency_repair_event(
        repair_id,
        "CONSISTENCY_REPAIR_COMPLETED",
        "completed",
        {
            "status": status,
            "repaired_approvals": repaired,
            "blocked_approvals": dangerous,
            "orphan_journal_approvals": blocked_orphans,
            "missing_store_approvals": skipped_missing,
            "after_ok": after.get("ok", False),
            "human_required": human_required,
        },
    )

    return {
        "repair_id": repair_id,
        "status": status,
        "policy": {
            "automatic": [
                "missing_created_events",
                "missing_terminal_events",
            ],
            "never_automatic": [
                "pending_with_terminal_event",
                "terminal_status_mismatches",
                "multiple_terminal_events",
                "orphan_journal_approvals",
            ],
        },
        "repaired_approvals": repaired,
        "blocked_approvals": dangerous,
        "orphan_journal_approvals": blocked_orphans,
        "missing_store_approvals": skipped_missing,
        "before": before,
        "after": after,
        "human_required": human_required,
    }


def pending_watchdog_event_key(approval_id, state):
    """Construit une cle bornee dans le temps pour les transitions watchdog."""
    bucket = int(time.time() // max(PENDING_WATCHDOG_STALLED_SECONDS, 60))
    return "pending-watchdog:%s:%s:%s" % (approval_id, state, bucket)


def pending_last_progress_timestamp(item):
    """Retourne le dernier instant de progression observable d'une approbation."""
    candidates = []
    for field in (
        "updated_at",
        "notification_updated_at",
        "decision_applied_at",
        "created_at",
    ):
        value = parse_utc(item.get(field))
        if value is not None:
            candidates.append(value)
    if not candidates:
        return time.time()
    return max(candidates)


def classify_pending_watchdog(item, controller_ok, now_ts=None):
    """Classe une approbation PENDING sans modifier son etat metier."""
    if now_ts is None:
        now_ts = time.time()

    age = max(0, int(now_ts - pending_last_progress_timestamp(item)))
    notification_status = item.get("notification_status", "")

    if not controller_ok:
        state = (
            "DEGRADED_CONTROLLER"
            if age < PENDING_WATCHDOG_STALLED_SECONDS
            else "STALLED_CONTROLLER"
        )
        return state, age, "controller_unreachable"

    if notification_status == "DELIVERED":
        return "WAITING_DECISION", age, "notification_delivered"

    if notification_status == "SENDING":
        if notification_lease_active(item):
            return "NOTIFYING", age, "notification_lease_active"
        return "STALLED_NOTIFICATION", age, "notification_lease_expired"

    if notification_status == "FAILED":
        retry_at = parse_utc(item.get("notification_next_retry_at"))
        if retry_at is not None and retry_at > now_ts:
            return "RETRY_SCHEDULED", age, "retry_scheduled"
        if age >= PENDING_WATCHDOG_STALLED_SECONDS:
            return "STALLED_NOTIFICATION", age, "retry_overdue"
        return "RETRY_DUE", age, "retry_due"

    if notification_status in ("", "PENDING"):
        if age >= PENDING_WATCHDOG_STALLED_SECONDS:
            return "STALLED_NOTIFICATION", age, "notification_never_delivered"
        if age >= PENDING_WATCHDOG_WARNING_SECONDS:
            return "DEGRADED_NOTIFICATION", age, "notification_pending_too_long"
        return "WAITING_NOTIFICATION", age, "notification_pending"

    return "UNKNOWN", age, "unknown_notification_status"


def pending_watchdog_snapshot():
    with PENDING_WATCHDOG_LOCK:
        states = {key: dict(value) for key, value in PENDING_WATCHDOG_STATE.items()}
        last_run_at = PENDING_WATCHDOG_LAST_RUN_AT
        last_error = PENDING_WATCHDOG_LAST_ERROR

    stalled = [
        approval_id
        for approval_id, value in states.items()
        if value.get("state", "").startswith("STALLED")
    ]
    degraded = [
        approval_id
        for approval_id, value in states.items()
        if value.get("state", "").startswith("DEGRADED")
    ]
    return {
        "enabled": True,
        "interval_seconds": PENDING_WATCHDOG_INTERVAL_SECONDS,
        "warning_seconds": PENDING_WATCHDOG_WARNING_SECONDS,
        "stalled_seconds": PENDING_WATCHDOG_STALLED_SECONDS,
        "last_run_at": last_run_at,
        "last_error": last_error,
        "pending_count": len(states),
        "stalled_count": len(stalled),
        "degraded_count": len(degraded),
        "stalled_approvals": stalled,
        "degraded_approvals": degraded,
        "approvals": states,
    }


def run_pending_watchdog_once():
    """Inspecte les PENDING et journalise uniquement leurs changements de classe."""
    global PENDING_WATCHDOG_LAST_RUN_AT
    global PENDING_WATCHDOG_LAST_ERROR

    controller_ok = controller_tcp_reachable()
    now_ts = time.time()
    path = store_path()

    try:
        with locked_store(path):
            data = load_store(path)
            pending = [
                dict(item)
                for item in data["approvals"].values()
                if item.get("status") == "PENDING"
            ]

        new_state = {}
        transitions = []

        with PENDING_WATCHDOG_LOCK:
            previous = {key: dict(value) for key, value in PENDING_WATCHDOG_STATE.items()}

        for item in pending:
            approval_id = item.get("approval_id", "")
            if not approval_id:
                continue
            state, age, reason = classify_pending_watchdog(
                item, controller_ok, now_ts=now_ts
            )
            value = {
                "state": state,
                "reason": reason,
                "age_seconds": age,
                "notification_status": item.get("notification_status", ""),
                "reminder_last_at": item.get("reminder_last_at", ""),
                "observed_at": utc_now(),
            }
            new_state[approval_id] = value
            maybe_remind_controller(item, age, value["state"])
            old_state = previous.get(approval_id, {}).get("state")
            if old_state != state:
                transitions.append((item, old_state or "NONE", value))

        for item, old_state, value in transitions:
            approval_id = item.get("approval_id", "")
            event_type = (
                "PENDING_WATCHDOG_STALLED"
                if value["state"].startswith("STALLED")
                else "PENDING_WATCHDOG_STATE_CHANGED"
            )
            journal.append_unique_event(
                event_type=event_type,
                event_key=pending_watchdog_event_key(approval_id, value["state"]),
                approval_id=approval_id,
                request_id=item.get("requestId", ""),
                change_id=item.get("change_id", ""),
                actor="BROKER",
                data={
                    "previous_state": old_state,
                    **value,
                },
            )

        with PENDING_WATCHDOG_LOCK:
            PENDING_WATCHDOG_STATE.clear()
            PENDING_WATCHDOG_STATE.update(new_state)
            PENDING_WATCHDOG_LAST_RUN_AT = utc_now()
            PENDING_WATCHDOG_LAST_ERROR = ""

        return pending_watchdog_snapshot()

    except Exception as exc:
        with PENDING_WATCHDOG_LOCK:
            PENDING_WATCHDOG_LAST_RUN_AT = utc_now()
            PENDING_WATCHDOG_LAST_ERROR = str(exc)
        raise


def pending_watchdog_loop():
    """Boucle de surveillance interne des approbations PENDING."""
    while not PENDING_WATCHDOG_STOP.is_set():
        try:
            run_pending_watchdog_once()
        except Exception as exc:
            print(
                "cgpt-approval-bridge: watchdog PENDING en echec: %s" % exc,
                file=sys.stderr,
                flush=True,
            )
        PENDING_WATCHDOG_STOP.wait(PENDING_WATCHDOG_INTERVAL_SECONDS)


def start_pending_watchdog():
    PENDING_WATCHDOG_STOP.clear()
    thread = threading.Thread(
        target=pending_watchdog_loop,
        name="cgpt-mcp-pending-watchdog",
        daemon=True,
    )
    thread.start()
    return thread


def stop_pending_watchdog():
    PENDING_WATCHDOG_STOP.set()


def note_session_activity(channel):
    """Memorise une activite de transport sans la confondre avec une progression."""
    global SESSION_LAST_MCP_ACTIVITY_AT
    global SESSION_LAST_CONTROLLER_ACTIVITY_AT

    now = utc_now()
    with SESSION_WATCHDOG_LOCK:
        if channel == "mcp":
            SESSION_LAST_MCP_ACTIVITY_AT = now
        elif channel == "controller":
            SESSION_LAST_CONTROLLER_ACTIVITY_AT = now


def session_watchdog_event_key(state):
    """Construit une cle bornee dans le temps pour l'etat global."""
    bucket = int(time.time() // max(SESSION_WATCHDOG_STALLED_SECONDS, 60))
    return "session-watchdog:%s:%s" % (state, bucket)


def latest_pending_progress_timestamp():
    """Retourne le dernier instant de progression des approbations PENDING."""
    path = store_path()
    with locked_store(path):
        data = load_store(path)
        pending = [
            dict(item)
            for item in data["approvals"].values()
            if item.get("status") == "PENDING"
        ]

    if not pending:
        return None, []

    values = [
        pending_last_progress_timestamp(item)
        for item in pending
    ]
    return max(values), pending


def classify_session_watchdog(now_ts=None):
    """Classe la progression globale sans modifier aucun etat metier."""
    if now_ts is None:
        now_ts = time.time()

    last_progress_ts, pending = latest_pending_progress_timestamp()
    pending_snapshot = pending_watchdog_snapshot()
    stalled_count = pending_snapshot.get("stalled_count", 0)
    degraded_count = pending_snapshot.get("degraded_count", 0)

    with SESSION_WATCHDOG_LOCK:
        last_mcp = SESSION_LAST_MCP_ACTIVITY_AT
        last_controller = SESSION_LAST_CONTROLLER_ACTIVITY_AT

    active_requests = active_requests_count()

    if not pending:
        return {
            "state": "IDLE",
            "reason": "no_pending_approval",
            "pending_count": 0,
            "active_transport_requests": active_requests,
            "progress_age_seconds": 0,
            "last_progress_at": "",
            "last_mcp_activity_at": last_mcp,
            "last_controller_activity_at": last_controller,
        }

    if last_progress_ts is None:
        last_progress_ts = parse_utc(PROCESS_STARTED_AT) or now_ts

    progress_age = max(0, int(now_ts - last_progress_ts))
    last_progress_at = utc_from_timestamp(last_progress_ts)

    if stalled_count:
        state = "STALLED"
        reason = "pending_watchdog_stalled"
    elif progress_age >= SESSION_WATCHDOG_STALLED_SECONDS:
        state = "STALLED"
        reason = "no_global_progress"
    elif degraded_count:
        state = "DEGRADED"
        reason = "pending_watchdog_degraded"
    elif progress_age >= SESSION_WATCHDOG_WARNING_SECONDS:
        state = "DEGRADED"
        reason = "global_progress_slow"
    else:
        state = "ACTIVE"
        reason = "progressing"

    return {
        "state": state,
        "reason": reason,
        "pending_count": len(pending),
        "active_transport_requests": active_requests,
        "progress_age_seconds": progress_age,
        "last_progress_at": last_progress_at,
        "last_mcp_activity_at": last_mcp,
        "last_controller_activity_at": last_controller,
    }


def session_watchdog_snapshot():
    with SESSION_WATCHDOG_LOCK:
        state = dict(SESSION_WATCHDOG_STATE)
        last_run_at = SESSION_WATCHDOG_LAST_RUN_AT
        last_error = SESSION_WATCHDOG_LAST_ERROR

    return {
        "enabled": True,
        "interval_seconds": SESSION_WATCHDOG_INTERVAL_SECONDS,
        "warning_seconds": SESSION_WATCHDOG_WARNING_SECONDS,
        "stalled_seconds": SESSION_WATCHDOG_STALLED_SECONDS,
        "last_run_at": last_run_at,
        "last_error": last_error,
        **state,
    }


def run_session_watchdog_once():
    """Observe la progression globale et journalise seulement les transitions."""
    global SESSION_WATCHDOG_LAST_RUN_AT
    global SESSION_WATCHDOG_LAST_ERROR

    try:
        new_state = classify_session_watchdog()
        with SESSION_WATCHDOG_LOCK:
            old_state = SESSION_WATCHDOG_STATE.get("state", "NONE")

        if old_state != new_state.get("state"):
            event_type = (
                "SESSION_WATCHDOG_STALLED"
                if new_state.get("state") == "STALLED"
                else "SESSION_WATCHDOG_STATE_CHANGED"
            )
            journal.append_unique_event(
                event_type=event_type,
                event_key=session_watchdog_event_key(new_state.get("state", "UNKNOWN")),
                actor="BROKER",
                data={
                    "previous_state": old_state,
                    **new_state,
                },
            )

        with SESSION_WATCHDOG_LOCK:
            SESSION_WATCHDOG_STATE.clear()
            SESSION_WATCHDOG_STATE.update(new_state)
            SESSION_WATCHDOG_LAST_RUN_AT = utc_now()
            SESSION_WATCHDOG_LAST_ERROR = ""

        return session_watchdog_snapshot()

    except Exception as exc:
        with SESSION_WATCHDOG_LOCK:
            SESSION_WATCHDOG_LAST_RUN_AT = utc_now()
            SESSION_WATCHDOG_LAST_ERROR = str(exc)
        raise


def session_watchdog_loop():
    """Boucle de surveillance de progression globale."""
    while not SESSION_WATCHDOG_STOP.is_set():
        try:
            run_session_watchdog_once()
        except Exception as exc:
            print(
                "cgpt-approval-bridge: watchdog SESSION en echec: %s" % exc,
                file=sys.stderr,
                flush=True,
            )
        SESSION_WATCHDOG_STOP.wait(SESSION_WATCHDOG_INTERVAL_SECONDS)


def start_session_watchdog():
    SESSION_WATCHDOG_STOP.clear()
    thread = threading.Thread(
        target=session_watchdog_loop,
        name="cgpt-mcp-session-watchdog",
        daemon=True,
    )
    thread.start()
    return thread


def stop_session_watchdog():
    SESSION_WATCHDOG_STOP.set()

def pool_is_saturated(snapshot):
    """Indique si un pool ne dispose plus d'aucune capacite."""
    return (
        snapshot.get("capacity", 0) > 0
        and snapshot.get("capacity_remaining", 0) <= 0
    )


def root_cause_event_key(root_cause):
    """Cle bornee pour journaliser un changement de cause racine."""
    bucket = int(time.time() // max(SESSION_WATCHDOG_WARNING_SECONDS, 60))
    return "root-cause:%s:%s" % (root_cause, bucket)


REMEDIATION_CLASSES = {
    "OBSERVE": {
        "mutates_state": False,
        "future_automation_eligible": False,
        "human_required_by_default": False,
        "description": "observation passive sans action corrective",
    },
    "DIAGNOSTIC": {
        "mutates_state": False,
        "future_automation_eligible": True,
        "human_required_by_default": False,
        "description": "diagnostic actif mais non mutatif",
    },
    "CONTROLLED": {
        "mutates_state": True,
        "future_automation_eligible": True,
        "human_required_by_default": False,
        "description": "remediation mutative autorisable sous garde-fous",
    },
    "MANUAL": {
        "mutates_state": True,
        "future_automation_eligible": False,
        "human_required_by_default": True,
        "description": "intervention humaine obligatoire",
    },
    "NONE": {
        "mutates_state": False,
        "future_automation_eligible": False,
        "human_required_by_default": False,
        "description": "aucune remediation necessaire",
    },
}



CONTROLLED_REMEDIATION_GUARDRAILS = {
    "REPAIR_CONSISTENCY": {
        "preconditions": [
            "store_readable",
            "journal_readable",
            "journal_integrity_valid",
            "only_safe_consistency_divergences",
        ],
        "max_attempts": 1,
        "cooldown_seconds": 300,
        "idempotence_scope": "consistency_snapshot",
        "success_condition": "store_journal_consistency_ok",
        "abort_conditions": [
            "ambiguous_divergence",
            "journal_integrity_failure",
            "store_unhealthy",
        ],
        "escalate_after_exhaustion": True,
        "escalation_state": "HUMAN_REQUIRED",
    },
    "RECOVER_NOTIFICATION_LEASE": {
        "preconditions": [
            "approval_pending",
            "notification_lease_expired_or_abandoned",
            "store_journal_consistency_ok",
        ],
        "max_attempts": 2,
        "cooldown_seconds": 60,
        "idempotence_scope": "approval_id_and_lease_id",
        "success_condition": "notification_lease_cleared",
        "abort_conditions": [
            "approval_terminal",
            "active_lease_present",
            "store_journal_divergence",
        ],
        "escalate_after_exhaustion": True,
        "escalation_state": "HUMAN_REQUIRED",
    },
    "RECONCILE_PENDING_APPROVALS": {
        "preconditions": [
            "approval_pending",
            "controller_reachable",
            "store_journal_consistency_ok",
        ],
        "max_attempts": 3,
        "cooldown_seconds": 60,
        "idempotence_scope": "approval_id_and_controller_decision",
        "success_condition": "decision_applied_or_notification_reestablished",
        "abort_conditions": [
            "approval_terminal",
            "controller_unreachable",
            "decision_correlation_rejected",
            "store_journal_divergence",
        ],
        "escalate_after_exhaustion": True,
        "escalation_state": "HUMAN_REQUIRED",
    },
    "RETRY_RECONCILIATION": {
        "preconditions": [
            "reconciliation_idle",
            "store_readable",
            "journal_readable",
            "journal_integrity_valid",
        ],
        "max_attempts": 2,
        "cooldown_seconds": 120,
        "idempotence_scope": "reconciliation_generation",
        "success_condition": "reconciliation_completed_without_error",
        "abort_conditions": [
            "reconciliation_running",
            "journal_integrity_failure",
            "store_unhealthy",
        ],
        "escalate_after_exhaustion": True,
        "escalation_state": "HUMAN_REQUIRED",
    },
}


def remediation_guardrails_for_action(action_code):
    """Retourne les garde-fous declaratifs d'une action CONTROLLED."""
    profile = CONTROLLED_REMEDIATION_GUARDRAILS.get(action_code)
    if profile is None:
        return {
            "defined": False,
            "preconditions": [],
            "max_attempts": 0,
            "cooldown_seconds": 0,
            "idempotence_scope": "",
            "success_condition": "",
            "abort_conditions": [],
            "escalate_after_exhaustion": True,
            "escalation_state": "HUMAN_REQUIRED",
        }
    result = dict(profile)
    result["defined"] = True
    result["preconditions"] = list(profile.get("preconditions", []))
    result["abort_conditions"] = list(profile.get("abort_conditions", []))
    return result



def remediation_registry_events():
    """Retourne les evenements persistants du registre de remediation."""
    wanted = {
        "REMEDIATION_ATTEMPT_STARTED",
        "REMEDIATION_ATTEMPT_COMPLETED",
        "REMEDIATION_ATTEMPT_FAILED",
        "REMEDIATION_ATTEMPT_ORPHANED",
        "REMEDIATION_ESCALATED",
    }
    try:
        events = journal.read_events()
    except journal.JournalError:
        return []
    return [event for event in events if event.get("event_type") in wanted]


def remediation_attempt_registry(action_code="", scope_key=""):
    """Reconstruit les tentatives depuis le journal append-only."""
    attempts = {}
    escalations = []

    for event in remediation_registry_events():
        data = event.get("data", {})
        if not isinstance(data, dict):
            continue
        event_action = data.get("action_code", "")
        event_scope = data.get("scope_key", "")
        if action_code and event_action != action_code:
            continue
        if scope_key and event_scope != scope_key:
            continue

        event_type = event.get("event_type", "")
        if event_type == "REMEDIATION_ESCALATED":
            escalations.append(event)
            continue

        attempt_id = data.get("attempt_id", "")
        if not attempt_id:
            continue

        item = attempts.setdefault(
            attempt_id,
            {
                "attempt_id": attempt_id,
                "action_code": event_action,
                "scope_key": event_scope,
                "approval_id": data.get("approval_id", ""),
                "status": "UNKNOWN",
                "started_at": "",
                "finished_at": "",
                "operator": data.get("operator", ""),
                "comment": "",
                "result": {},
                "instance_id": data.get("instance_id", ""),
                "orphaned_at": "",
                "orphan_reason": "",
            },
        )

        if event_type == "REMEDIATION_ATTEMPT_STARTED":
            item["status"] = "STARTED"
            item["started_at"] = event.get("timestamp", "")
            item["operator"] = data.get("operator", item.get("operator", ""))
            item["instance_id"] = data.get("instance_id", item.get("instance_id", ""))
        elif event_type == "REMEDIATION_ATTEMPT_ORPHANED":
            item["status"] = "ORPHANED"
            item["orphaned_at"] = event.get("timestamp", "")
            item["orphan_reason"] = data.get("reason", "")
        elif event_type == "REMEDIATION_ATTEMPT_COMPLETED":
            item["status"] = "COMPLETED"
            item["finished_at"] = event.get("timestamp", "")
            item["comment"] = data.get("comment", "")
            item["result"] = data.get("result", {}) if isinstance(data.get("result", {}), dict) else {}
        elif event_type == "REMEDIATION_ATTEMPT_FAILED":
            item["status"] = "FAILED"
            item["finished_at"] = event.get("timestamp", "")
            item["comment"] = data.get("comment", "")
            item["result"] = data.get("result", {}) if isinstance(data.get("result", {}), dict) else {}

    ordered = sorted(
        attempts.values(),
        key=lambda item: (item.get("started_at", ""), item.get("attempt_id", "")),
    )
    return {
        "attempts": ordered,
        "escalations": escalations,
        "attempt_count": len(ordered),
        "in_progress": [item for item in ordered if item.get("status") == "STARTED"],
    }


def remediation_attempt_history(action_code, scope_key):
    """Compatibilite: toutes les tentatives demarrees consomment le budget."""
    return remediation_attempt_registry(action_code, scope_key)["attempts"]


def remediation_escalated(action_code, scope_key):
    """Indique si cette portee a deja ete escaladee vers HUMAN_REQUIRED."""
    return bool(
        remediation_attempt_registry(action_code, scope_key)["escalations"]
    )


def remediation_attempt_by_id(attempt_id):
    """Retourne une tentative reconstruite par son identifiant."""
    registry = remediation_attempt_registry()
    for attempt in registry["attempts"]:
        if attempt.get("attempt_id") == attempt_id:
            return attempt
    return None

def remediation_scope_key(action_code, approval_id=""):
    """Construit une portee stable a partir du profil d'idempotence."""
    guardrails = remediation_guardrails_for_action(action_code)
    scope = guardrails.get("idempotence_scope", "")

    if scope in (
        "approval_id_and_lease_id",
        "approval_id_and_controller_decision",
    ):
        if not approval_id:
            return ""
        path = store_path()
        with locked_store(path):
            data = load_store(path)
            item = data.get("approvals", {}).get(approval_id)
            if item is None:
                return ""
            if scope == "approval_id_and_lease_id":
                lease_id = item.get("notification_lease_id", "") or "none"
                return "%s:%s" % (approval_id, lease_id)
            decision_id = item.get("decision_id", "") or "none"
            return "%s:%s" % (approval_id, decision_id)

    if scope == "consistency_snapshot":
        snapshot = store_journal_consistency_snapshot()
        return json.dumps(
            {
                "ok": snapshot.get("ok"),
                "missing_created_events": snapshot.get("missing_created_events", []),
                "missing_terminal_events": snapshot.get("missing_terminal_events", []),
                "pending_with_terminal_event": snapshot.get("pending_with_terminal_event", []),
                "terminal_status_mismatches": snapshot.get("terminal_status_mismatches", []),
                "multiple_terminal_events": snapshot.get("multiple_terminal_events", []),
                "orphan_journal_approvals": snapshot.get("orphan_journal_approvals", []),
            },
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )

    if scope == "reconciliation_generation":
        reconciliation = reconciliation_snapshot()
        return "%s:%s" % (
            reconciliation.get("last_started_at", "never"),
            reconciliation.get("last_finished_at", "never"),
        )

    return action_code


def evaluate_remediation_preconditions(action_code, approval_id=""):
    """Evalue les preconditions declaratives d'une remediation CONTROLLED."""
    guardrails = remediation_guardrails_for_action(action_code)
    checks = {}

    store = store_health_snapshot()
    journal_state = journal.journal_stats()
    try:
        journal_integrity = journal.verify_journal()
    except journal.JournalError as exc:
        journal_integrity = {"ok": False, "error": str(exc)}
    consistency = store_journal_consistency_snapshot()
    reconciliation = reconciliation_snapshot()
    controller_ok = controller_tcp_reachable()

    item = None
    if approval_id:
        path = store_path()
        with locked_store(path):
            data = load_store(path)
            current = data.get("approvals", {}).get(approval_id)
            if current is not None:
                item = dict(current)

    for name in guardrails.get("preconditions", []):
        ok = False
        detail = ""

        if name == "store_readable":
            ok = bool(store.get("ok"))
            detail = store.get("error", "")
        elif name == "journal_readable":
            ok = bool(journal_state.get("ok"))
            detail = journal_state.get("error", "")
        elif name == "journal_integrity_valid":
            ok = bool(journal_integrity.get("ok"))
            detail = journal_integrity.get("error", "")
        elif name == "only_safe_consistency_divergences":
            ambiguous = bool(
                consistency.get("pending_with_terminal_event")
                or consistency.get("terminal_status_mismatches")
                or consistency.get("multiple_terminal_events")
                or consistency.get("orphan_journal_approvals")
            )
            safe_missing = bool(
                consistency.get("missing_created_events")
                or consistency.get("missing_terminal_events")
            )
            ok = safe_missing and not ambiguous
            detail = "safe_missing_only" if ok else "ambiguous_or_no_safe_divergence"
        elif name == "approval_pending":
            ok = bool(item and item.get("status") == "PENDING")
            detail = "approval_missing" if item is None else item.get("status", "")
        elif name == "notification_lease_expired_or_abandoned":
            if item is not None:
                lease_status = item.get("notification_status", "")
                lease_until = parse_utc(item.get("notification_lease_until", ""))
                ok = (
                    lease_status == "SENDING"
                    and (lease_until is None or time.time() >= lease_until)
                )
                detail = lease_status
        elif name == "store_journal_consistency_ok":
            ok = bool(consistency.get("ok"))
            detail = consistency.get("error", "")
        elif name == "controller_reachable":
            ok = bool(controller_ok)
            detail = controller_url()
        elif name == "reconciliation_idle":
            ok = reconciliation.get("state") != "RUNNING"
            detail = reconciliation.get("state", "")
        else:
            ok = False
            detail = "precondition inconnue"

        checks[name] = {"ok": ok, "detail": detail}

    return checks


def evaluate_controlled_remediation(action_code, approval_id=""):
    """Evalue dynamiquement les garde-fous sans executer la remediation."""
    guardrails = remediation_guardrails_for_action(action_code)
    if not guardrails.get("defined"):
        raise ValidationError(
            "action CONTROLLED inconnue ou sans garde-fous : %s" % action_code
        )

    scope_key = remediation_scope_key(action_code, approval_id)
    checks = evaluate_remediation_preconditions(action_code, approval_id)
    failed = [name for name, result in checks.items() if not result.get("ok")]

    if not scope_key:
        failed.append("idempotence_scope_unresolved")

    history = remediation_attempt_history(action_code, scope_key) if scope_key else []
    attempts_used = len(history)
    max_attempts = int(guardrails.get("max_attempts", 0))
    cooldown_seconds = int(guardrails.get("cooldown_seconds", 0))
    cooldown_remaining = 0

    last_attempt_at = ""
    if history:
        last_attempt_at = history[-1].get("started_at", "")
        last_ts = parse_utc(last_attempt_at)
        if last_ts is not None:
            cooldown_remaining = max(
                0,
                int((last_ts + cooldown_seconds) - time.time()),
            )

    escalated = remediation_escalated(action_code, scope_key) if scope_key else False

    if escalated:
        state = "HUMAN_REQUIRED"
    elif max_attempts > 0 and attempts_used >= max_attempts:
        state = "ATTEMPTS_EXHAUSTED"
    elif failed:
        state = "PRECONDITION_FAILED"
    elif cooldown_remaining > 0:
        state = "COOLDOWN"
    else:
        state = "ELIGIBLE"

    human_required = (
        state == "HUMAN_REQUIRED"
        or (
            state == "ATTEMPTS_EXHAUSTED"
            and guardrails.get("escalate_after_exhaustion", False)
        )
    )

    return {
        "state": state,
        "action_code": action_code,
        "approval_id": approval_id,
        "scope_key": scope_key,
        "attempts_used": attempts_used,
        "max_attempts": max_attempts,
        "attempts_remaining": max(0, max_attempts - attempts_used),
        "cooldown_seconds": cooldown_seconds,
        "cooldown_remaining_seconds": cooldown_remaining,
        "last_attempt_at": last_attempt_at,
        "preconditions": checks,
        "failed_preconditions": failed,
        "human_required": human_required,
        "automatic_execution_enabled": automatic_action_allowed(
            action_code
        ) and action_code == "RECOVER_NOTIFICATION_LEASE",
        "automatic_policy_enabled": bool(AUTO_REMEDIATION_ENABLED),
        "automatic_policy_allowed": automatic_action_allowed(action_code),
        "automatic_scheduler_enabled": automatic_action_allowed(
            "RECOVER_NOTIFICATION_LEASE"
        ),
        "orphan_recovery": {
            "enabled": True,
            "timeout_seconds": REMEDIATION_ORPHAN_TIMEOUT_SECONDS,
            "replays_remediation": False,
        },
        "guardrails": guardrails,
        "evaluated_at": utc_now(),
    }


def new_remediation_attempt_id():
    return "remediation-" + uuid.uuid4().hex[:16]


def maybe_escalate_remediation(action_code, scope_key, approval_id="", reason=""):
    """Journalise une escalade idempotente si le budget est epuise."""
    guardrails = remediation_guardrails_for_action(action_code)
    if not guardrails.get("escalate_after_exhaustion", False):
        return None
    registry = remediation_attempt_registry(action_code, scope_key)
    max_attempts = int(guardrails.get("max_attempts", 0))
    if max_attempts <= 0 or registry["attempt_count"] < max_attempts:
        return None
    if registry["escalations"]:
        return registry["escalations"][-1]
    return journal.append_unique_event(
        event_type="REMEDIATION_ESCALATED",
        event_key="remediation-escalated:%s:%s" % (action_code, scope_key),
        actor="BROKER",
        approval_id=approval_id,
        data={
            "action_code": action_code,
            "scope_key": scope_key,
            "approval_id": approval_id,
            "reason": reason or "attempt_budget_exhausted",
            "state": guardrails.get("escalation_state", "HUMAN_REQUIRED"),
        },
    )


def do_start_remediation_attempt(args):
    """Demarre manuellement une tentative CONTROLLED apres evaluation ELIGIBLE."""
    action_code = require_str(args, "action_code", 100)
    approval_id = optional_str(args, "approval_id", 100)
    operator = require_str(args, "operator", 100)
    comment = optional_str(args, "comment", 1000)

    evaluation = evaluate_controlled_remediation(action_code, approval_id)
    if evaluation.get("state") != "ELIGIBLE":
        raise ValidationError(
            "remediation non eligible: %s" % evaluation.get("state", "UNKNOWN")
        )

    attempt_id = new_remediation_attempt_id()
    scope_key = evaluation.get("scope_key", "")
    journal.append_unique_event(
        event_type="REMEDIATION_ATTEMPT_STARTED",
        event_key="remediation-attempt:%s:started" % attempt_id,
        actor=operator,
        approval_id=approval_id,
        data={
            "attempt_id": attempt_id,
            "action_code": action_code,
            "scope_key": scope_key,
            "approval_id": approval_id,
            "operator": operator,
            "comment": comment,
            "evaluation_state": evaluation.get("state"),
            "instance_id": INSTANCE_ID,
        },
    )
    return {
        "status": "STARTED",
        "attempt_id": attempt_id,
        "action_code": action_code,
        "approval_id": approval_id,
        "scope_key": scope_key,
        "operator": operator,
        "automatic_execution": False,
        "manual_execution_required": True,
        "evaluation_before_start": evaluation,
    }


def do_finish_remediation_attempt(args, success):
    """Cloture une tentative manuelle en succes ou echec."""
    attempt_id = require_str(args, "attempt_id", 100)
    operator = require_str(args, "operator", 100)
    comment = optional_str(args, "comment", 2000)
    result = args.get("result", {})
    if result is None:
        result = {}
    if not isinstance(result, dict):
        raise ValidationError("parametre 'result' : objet attendu")

    attempt = remediation_attempt_by_id(attempt_id)
    if attempt is None:
        raise ValidationError("attempt_id '%s' inconnu" % attempt_id)
    if attempt.get("status") != "STARTED":
        raise ValidationError(
            "tentative '%s' deja cloturee avec statut '%s'"
            % (attempt_id, attempt.get("status", "UNKNOWN"))
        )

    action_code = attempt.get("action_code", "")
    scope_key = attempt.get("scope_key", "")
    approval_id = attempt.get("approval_id", "")
    event_type = (
        "REMEDIATION_ATTEMPT_COMPLETED"
        if success
        else "REMEDIATION_ATTEMPT_FAILED"
    )
    suffix = "completed" if success else "failed"
    journal.append_unique_event(
        event_type=event_type,
        event_key="remediation-attempt:%s:%s" % (attempt_id, suffix),
        actor=operator,
        approval_id=approval_id,
        data={
            "attempt_id": attempt_id,
            "action_code": action_code,
            "scope_key": scope_key,
            "approval_id": approval_id,
            "operator": operator,
            "comment": comment,
            "result": result,
        },
    )

    escalation = None
    if not success:
        escalation = maybe_escalate_remediation(
            action_code,
            scope_key,
            approval_id=approval_id,
            reason="attempt_failed_and_budget_exhausted",
        )

    return {
        "status": "COMPLETED" if success else "FAILED",
        "attempt_id": attempt_id,
        "action_code": action_code,
        "approval_id": approval_id,
        "scope_key": scope_key,
        "escalated": escalation is not None,
        "automatic_execution": False,
        "registry": remediation_attempt_registry(action_code, scope_key),
    }



def remediation_attempt_is_orphan_candidate(attempt, now_ts=None):
    """Indique si une tentative STARTED appartient a une ancienne instance et a expire."""
    if attempt.get("status") != "STARTED":
        return False

    if now_ts is None:
        now_ts = time.time()

    started_ts = parse_utc(attempt.get("started_at", ""))
    if started_ts is None:
        return False

    if now_ts - started_ts < REMEDIATION_ORPHAN_TIMEOUT_SECONDS:
        return False

    attempt_instance = attempt.get("instance_id", "")
    if attempt_instance:
        return attempt_instance != INSTANCE_ID

    process_started_ts = parse_utc(PROCESS_STARTED_AT)
    if process_started_ts is None:
        return False

    return started_ts < process_started_ts


def recover_orphaned_remediation_attempts():
    """Cloture les tentatives abandonnees par une ancienne instance.

    La recuperation est purement technique : elle ne rejoue aucune remediation.
    Chaque tentative ORPHANED est ensuite cloturee en FAILED, ce qui conserve
    budget, cooldown et escalade existants.
    """
    registry = remediation_attempt_registry()
    candidates = [
        item for item in registry["attempts"]
        if remediation_attempt_is_orphan_candidate(item)
    ]

    recovered = []
    escalated = []

    for attempt in candidates:
        attempt_id = attempt.get("attempt_id", "")
        action_code = attempt.get("action_code", "")
        scope_key = attempt.get("scope_key", "")
        approval_id = attempt.get("approval_id", "")

        journal.append_unique_event(
            event_type="REMEDIATION_ATTEMPT_ORPHANED",
            event_key="remediation-attempt:%s:orphaned" % attempt_id,
            actor="BROKER",
            approval_id=approval_id,
            data={
                "attempt_id": attempt_id,
                "action_code": action_code,
                "scope_key": scope_key,
                "approval_id": approval_id,
                "instance_id": attempt.get("instance_id", ""),
                "reason": "previous_instance_disappeared_before_completion",
                "orphan_timeout_seconds": REMEDIATION_ORPHAN_TIMEOUT_SECONDS,
            },
        )

        journal.append_unique_event(
            event_type="REMEDIATION_ATTEMPT_FAILED",
            event_key="remediation-attempt:%s:failed" % attempt_id,
            actor="BROKER",
            approval_id=approval_id,
            data={
                "attempt_id": attempt_id,
                "action_code": action_code,
                "scope_key": scope_key,
                "approval_id": approval_id,
                "operator": "BROKER",
                "comment": "tentative orpheline cloturee apres redemarrage",
                "result": {
                    "failure_kind": "ORPHANED_AFTER_CRASH",
                    "technical_failure": True,
                },
            },
        )

        escalation = maybe_escalate_remediation(
            action_code,
            scope_key,
            approval_id=approval_id,
            reason="orphaned_attempt_and_budget_exhausted",
        )
        if escalation is not None:
            escalated.append(attempt_id)

        recovered.append(attempt_id)

    return {
        "status": "RECOVERED" if recovered else "NOT_REQUIRED",
        "orphan_timeout_seconds": REMEDIATION_ORPHAN_TIMEOUT_SECONDS,
        "orphaned_attempts": recovered,
        "orphaned_count": len(recovered),
        "escalated_attempts": escalated,
        "escalated_count": len(escalated),
    }


def do_remediation_registry(args):
    """Expose le registre reconstruit, sans mutation."""
    action_code = optional_str(args, "action_code", 100)
    scope_key = optional_str(args, "scope_key", 1000)
    return remediation_attempt_registry(action_code, scope_key)


def do_evaluate_remediation(args):
    """Outil MCP de lecture seule pour evaluer une remediation CONTROLLED."""
    action_code = require_str(args, "action_code", 100)
    approval_id = optional_str(args, "approval_id", 100)
    return evaluate_controlled_remediation(action_code, approval_id)


CONTROLLED_REMEDIATION_EXECUTORS = {
    "RECOVER_NOTIFICATION_LEASE",
    "RECONCILE_PENDING_APPROVALS",
    "RETRY_RECONCILIATION",
    "REPAIR_CONSISTENCY",
}



def auto_remediation_circuit_state_payload():
    """Construit l'etat persistant du circuit breaker."""
    with AUTO_REMEDIATION_CIRCUIT_LOCK:
        state = dict(AUTO_REMEDIATION_CIRCUIT)

    #
    # Une sonde HALF_OPEN en vol appartient uniquement au processus courant.
    # Elle ne doit jamais survivre a un redemarrage.
    #
    state["half_open_probe_inflight"] = False

    return {
        "schema_version": AUTO_REMEDIATION_CIRCUIT_STATE_SCHEMA_VERSION,
        "saved_at": utc_now(),
        "server_version": SERVER_VERSION,
        "state": state,
    }


def save_auto_remediation_circuit_state():
    """Persiste atomiquement et durablement le circuit breaker."""
    path = AUTO_REMEDIATION_CIRCUIT_STATE_PATH
    ensure_parent(path)

    payload = auto_remediation_circuit_state_payload()
    tmp_path = (
        path
        + ".tmp."
        + str(os.getpid())
        + "."
        + str(threading.get_ident())
    )
    replaced = False

    try:
        with open(tmp_path, "w", encoding="utf-8") as handle:
            json.dump(
                payload,
                handle,
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
            )
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())

        os.replace(tmp_path, path)
        replaced = True
        fsync_directory(path)

    except OSError as exc:
        with AUTO_REMEDIATION_CIRCUIT_LOCK:
            AUTO_REMEDIATION_CIRCUIT_PERSISTENCE["last_error"] = str(exc)
        raise StoreError(
            "persistance circuit breaker impossible: %s" % exc
        ) from exc

    finally:
        if not replaced:
            try:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except OSError:
                pass

    with AUTO_REMEDIATION_CIRCUIT_LOCK:
        AUTO_REMEDIATION_CIRCUIT_PERSISTENCE["saved_at"] = payload["saved_at"]
        AUTO_REMEDIATION_CIRCUIT_PERSISTENCE["last_error"] = ""

    return payload


def validate_auto_remediation_circuit_state(raw):
    """Valide et normalise un etat persistant du circuit breaker."""
    if not isinstance(raw, dict):
        raise StoreError("etat persistant circuit breaker invalide")

    version = raw.get("schema_version")
    if version != AUTO_REMEDIATION_CIRCUIT_STATE_SCHEMA_VERSION:
        raise StoreError(
            "version etat circuit breaker non supportee: %r" % version
        )

    state = raw.get("state")
    if not isinstance(state, dict):
        raise StoreError("champ state du circuit breaker invalide")

    circuit_state = state.get("state")
    if circuit_state not in ("CLOSED", "OPEN", "HALF_OPEN"):
        raise StoreError(
            "etat circuit breaker invalide: %r" % circuit_state
        )

    normalized = {
        "state": circuit_state,
        "opened_at": state.get("opened_at", "") or "",
        "open_until": state.get("open_until", "") or "",
        "half_open_probe_inflight": False,
        "consecutive_failures": int(
            state.get("consecutive_failures", 0) or 0
        ),
        "failure_timestamps": [],
        "last_transition_at": state.get("last_transition_at", "") or "",
        "last_reason": state.get("last_reason", "") or "",
    }

    raw_timestamps = state.get("failure_timestamps", [])
    if not isinstance(raw_timestamps, list):
        raise StoreError("failure_timestamps invalide")

    now_ts = time.time()
    for value in raw_timestamps:
        try:
            ts = float(value)
        except (TypeError, ValueError):
            continue
        if now_ts - ts <= AUTO_REMEDIATION_CB_FAILURE_WINDOW_SECONDS:
            normalized["failure_timestamps"].append(ts)

    normalized["consecutive_failures"] = len(
        normalized["failure_timestamps"]
    )

    return normalized


def load_auto_remediation_circuit_state():
    """Recharge le circuit breaker sans jamais affaiblir sa protection."""
    path = AUTO_REMEDIATION_CIRCUIT_STATE_PATH

    try:
        with open(path, "r", encoding="utf-8") as handle:
            raw = json.load(handle)
        state = validate_auto_remediation_circuit_state(raw)

    except FileNotFoundError:
        with AUTO_REMEDIATION_CIRCUIT_LOCK:
            AUTO_REMEDIATION_CIRCUIT_PERSISTENCE.update({
                "loaded": True,
                "loaded_at": utc_now(),
                "last_error": "",
            })
        save_auto_remediation_circuit_state()
        return auto_remediation_circuit_snapshot()

    except (json.JSONDecodeError, OSError, StoreError, ValueError) as exc:
        #
        # Fail-safe : un etat persistant illisible ne doit jamais remettre
        # l'auto-remediation en CLOSED. On ouvre temporairement le circuit.
        #
        now_ts = time.time()
        with AUTO_REMEDIATION_CIRCUIT_LOCK:
            AUTO_REMEDIATION_CIRCUIT.update({
                "state": "OPEN",
                "opened_at": utc_from_timestamp(now_ts),
                "open_until": utc_from_timestamp(
                    now_ts + AUTO_REMEDIATION_CB_OPEN_SECONDS
                ),
                "half_open_probe_inflight": False,
                "consecutive_failures": 0,
                "failure_timestamps": [],
                "last_transition_at": utc_now(),
                "last_reason": "persistent_state_invalid",
            })
            AUTO_REMEDIATION_CIRCUIT_PERSISTENCE.update({
                "loaded": True,
                "loaded_at": utc_now(),
                "last_error": str(exc),
            })

        journal.append_repeated_event(
            event_type="AUTO_REMEDIATION_CIRCUIT_PERSISTENCE_INVALID",
            actor="BROKER",
            data={
                "path": path,
                "error": str(exc),
                "state": "OPEN",
                "instance_id": INSTANCE_ID,
            },
        )

        save_auto_remediation_circuit_state()
        return auto_remediation_circuit_snapshot()

    with AUTO_REMEDIATION_CIRCUIT_LOCK:
        AUTO_REMEDIATION_CIRCUIT.update(state)
        AUTO_REMEDIATION_CIRCUIT_PERSISTENCE.update({
            "loaded": True,
            "loaded_at": utc_now(),
            "saved_at": raw.get("saved_at", "") or "",
            "last_error": "",
        })

    journal.append_repeated_event(
        event_type="AUTO_REMEDIATION_CIRCUIT_RESTORED",
        actor="BROKER",
        data={
            "path": path,
            "state": state.get("state"),
            "open_until": state.get("open_until", ""),
            "failure_count": len(
                state.get("failure_timestamps", [])
            ),
            "instance_id": INSTANCE_ID,
        },
    )

    return auto_remediation_circuit_snapshot()


def auto_remediation_circuit_snapshot():
    with AUTO_REMEDIATION_CIRCUIT_LOCK:
        state = dict(AUTO_REMEDIATION_CIRCUIT)
    state.update({
        "failure_threshold": AUTO_REMEDIATION_CB_FAILURE_THRESHOLD,
        "failure_window_seconds": AUTO_REMEDIATION_CB_FAILURE_WINDOW_SECONDS,
        "open_seconds": AUTO_REMEDIATION_CB_OPEN_SECONDS,
        "persistence": dict(AUTO_REMEDIATION_CIRCUIT_PERSISTENCE),
    })
    return state


def set_auto_remediation_circuit(state, reason="", opened_at=None, open_until=None, probe=False, failures=None, failure_timestamps=None):
    now = utc_now()
    with AUTO_REMEDIATION_CIRCUIT_LOCK:
        previous = AUTO_REMEDIATION_CIRCUIT.get("state", "CLOSED")
        AUTO_REMEDIATION_CIRCUIT["state"] = state
        AUTO_REMEDIATION_CIRCUIT["last_transition_at"] = now
        AUTO_REMEDIATION_CIRCUIT["last_reason"] = reason
        AUTO_REMEDIATION_CIRCUIT["half_open_probe_inflight"] = probe
        if opened_at is not None: AUTO_REMEDIATION_CIRCUIT["opened_at"] = opened_at
        if open_until is not None: AUTO_REMEDIATION_CIRCUIT["open_until"] = open_until
        if failures is not None: AUTO_REMEDIATION_CIRCUIT["consecutive_failures"] = failures
        if failure_timestamps is not None: AUTO_REMEDIATION_CIRCUIT["failure_timestamps"] = list(failure_timestamps)
    if previous != state:
        journal.append_repeated_event(
            event_type="AUTO_REMEDIATION_CIRCUIT_%s" % state,
            actor="BROKER",
            data={"previous_state": previous, "state": state, "reason": reason, "instance_id": INSTANCE_ID},
        )

    save_auto_remediation_circuit_state()


def auto_remediation_circuit_allows_execution():
    snap = auto_remediation_circuit_snapshot()
    state = snap.get("state")
    if state == "OPEN":
        until = parse_utc(snap.get("open_until", ""))
        if until is not None and time.time() >= until:
            set_auto_remediation_circuit("HALF_OPEN", "cooldown_elapsed", probe=False)
            state = "HALF_OPEN"
        else:
            return False
    if state == "HALF_OPEN":
        with AUTO_REMEDIATION_CIRCUIT_LOCK:
            if AUTO_REMEDIATION_CIRCUIT.get("half_open_probe_inflight"):
                return False
            AUTO_REMEDIATION_CIRCUIT["half_open_probe_inflight"] = True
        save_auto_remediation_circuit_state()
        return True
    return True


def auto_remediation_record_result(success):
    snap = auto_remediation_circuit_snapshot()
    if success:
        if snap.get("state") != "CLOSED" or snap.get("consecutive_failures", 0):
            set_auto_remediation_circuit(
                "CLOSED",
                "automatic_remediation_succeeded",
                opened_at="",
                open_until="",
                probe=False,
                failures=0,
                failure_timestamps=[],
            )
        return

    now_ts = time.time()
    recent = []
    for value in snap.get("failure_timestamps", []):
        try:
            ts = float(value)
        except (TypeError, ValueError):
            continue
        if now_ts - ts <= AUTO_REMEDIATION_CB_FAILURE_WINDOW_SECONDS:
            recent.append(ts)
    recent.append(now_ts)
    failures = len(recent)

    if snap.get("state") == "HALF_OPEN" or failures >= AUTO_REMEDIATION_CB_FAILURE_THRESHOLD:
        set_auto_remediation_circuit(
            "OPEN",
            "automatic_remediation_failed",
            opened_at=utc_from_timestamp(now_ts),
            open_until=utc_from_timestamp(now_ts + AUTO_REMEDIATION_CB_OPEN_SECONDS),
            probe=False,
            failures=failures,
            failure_timestamps=recent,
        )
    else:
        with AUTO_REMEDIATION_CIRCUIT_LOCK:
            AUTO_REMEDIATION_CIRCUIT["consecutive_failures"] = failures
            AUTO_REMEDIATION_CIRCUIT["failure_timestamps"] = recent
            AUTO_REMEDIATION_CIRCUIT["half_open_probe_inflight"] = False
        save_auto_remediation_circuit_state()


def auto_remediation_policy_snapshot():
    """Expose la barriere de politique d'auto-remediation.

    v0.56 active un ordonnanceur limite a RECOVER_NOTIFICATION_LEASE.
    ENABLE autorise le principe, tandis que ACTIONS constitue une allowlist.
    """
    executable = set(CONTROLLED_REMEDIATION_EXECUTORS)
    requested = list(AUTO_REMEDIATION_REQUESTED_ACTIONS)

    allowed = [
        code
        for code in requested
        if code in executable
    ]
    invalid = [
        code
        for code in requested
        if code not in executable
    ]

    config_valid = bool(
        AUTO_REMEDIATION_CONFIGURATION.get(
            "valid",
            False,
        )
    )

    return {
        "enabled": bool(AUTO_REMEDIATION_ENABLED),
        "configuration_valid": config_valid,
        "configuration_errors": list(
            AUTO_REMEDIATION_CONFIGURATION.get(
                "errors",
                [],
            )
        ),
        "configuration_warnings": list(
            AUTO_REMEDIATION_CONFIGURATION.get(
                "warnings",
                [],
            )
        ),
        "scheduler_enabled": bool(
            config_valid
            and AUTO_REMEDIATION_ENABLED
            and "RECOVER_NOTIFICATION_LEASE" in allowed
        ),
        "execution_active": bool(
            config_valid
            and AUTO_REMEDIATION_ENABLED
            and "RECOVER_NOTIFICATION_LEASE" in allowed
        ),
        "policy_only": False,
        "requested_actions": requested,
        "allowed_actions": allowed,
        "invalid_actions": invalid,
        "available_controlled_actions": sorted(executable),
        "default_deny": True,
        "requires_explicit_allowlist": True,
        "manual_actions_never_automatic": True,
        "diagnostic_actions_never_mutating": True,
        "guardrails_required": True,
        "automatic_execution_requires_next_stage": False,
        "scheduler_interval_seconds": AUTO_REMEDIATION_INTERVAL_SECONDS,
        "scheduler_supported_actions": [
            "RECOVER_NOTIFICATION_LEASE"
        ],
        "scheduler_state": auto_remediation_scheduler_snapshot(),
        "circuit_breaker": auto_remediation_circuit_snapshot(),
        "environment": {
            "enable": "CGPT_AUTO_REMEDIATION_ENABLE",
            "actions": "CGPT_AUTO_REMEDIATION_ACTIONS",
            "interval": "CGPT_AUTO_REMEDIATION_INTERVAL",
            "circuit_failure_threshold": "CGPT_AUTO_REMEDIATION_CB_FAILURE_THRESHOLD",
            "circuit_failure_window": "CGPT_AUTO_REMEDIATION_CB_FAILURE_WINDOW",
            "circuit_open_seconds": "CGPT_AUTO_REMEDIATION_CB_OPEN_SECONDS",
            "circuit_state_path": "CGPT_AUTO_REMEDIATION_CB_STATE_PATH",
        },
        "configuration": {
            "valid": bool(
                AUTO_REMEDIATION_CONFIGURATION.get(
                    "valid",
                    False,
                )
            ),
            "errors": list(
                AUTO_REMEDIATION_CONFIGURATION.get(
                    "errors",
                    [],
                )
            ),
            "warnings": list(
                AUTO_REMEDIATION_CONFIGURATION.get(
                    "warnings",
                    [],
                )
            ),
        },
    }


def automatic_action_allowed(action_code):
    """Indique si la politique autoriserait cette action, sans l'executer."""
    policy = auto_remediation_policy_snapshot()
    return (
        policy.get("configuration_valid", False)
        and policy.get("enabled", False)
        and action_code in policy.get("allowed_actions", [])
        and action_code in CONTROLLED_REMEDIATION_EXECUTORS
    )



def auto_remediation_scheduler_snapshot():
    """Expose l'etat interne de l'ordonnanceur automatique."""
    with AUTO_REMEDIATION_LOCK:
        state = dict(AUTO_REMEDIATION_STATE)
    enabled = (
        bool(
            AUTO_REMEDIATION_CONFIGURATION.get(
                "valid",
                False,
            )
        )
        and bool(AUTO_REMEDIATION_ENABLED)
        and "RECOVER_NOTIFICATION_LEASE"
        in AUTO_REMEDIATION_REQUESTED_ACTIONS
        and "RECOVER_NOTIFICATION_LEASE"
        in CONTROLLED_REMEDIATION_EXECUTORS
    )
    return {
        "enabled": enabled,
        "interval_seconds": AUTO_REMEDIATION_INTERVAL_SECONDS,
        **state,
    }


def set_auto_remediation_state(**values):
    with AUTO_REMEDIATION_LOCK:
        AUTO_REMEDIATION_STATE.update(values)


def execute_automatic_recover_notification_lease(approval_id):
    """Execute RECOVER_NOTIFICATION_LEASE via les memes garde-fous.

    Cette voie est reservee a l'ordonnanceur automatique et utilise le
    meme registre durable de tentatives que l'execution manuelle.
    """
    action_code = "RECOVER_NOTIFICATION_LEASE"

    if not automatic_action_allowed(action_code):
        return {
            "status": "POLICY_DENIED",
            "approval_id": approval_id,
        }

    evaluation = evaluate_controlled_remediation(
        action_code,
        approval_id,
    )
    if evaluation.get("state") != "ELIGIBLE":
        return {
            "status": "SKIPPED",
            "approval_id": approval_id,
            "evaluation": evaluation,
        }

    started = do_start_remediation_attempt(
        {
            "action_code": action_code,
            "approval_id": approval_id,
            "operator": "AUTO_REMEDIATION",
            "comment": "ordonnanceur automatique v0.56",
        }
    )
    attempt_id = started["attempt_id"]

    try:
        result = execute_recover_notification_lease(
            approval_id
        )
    except Exception as exc:
        failed = do_finish_remediation_attempt(
            {
                "attempt_id": attempt_id,
                "operator": "AUTO_REMEDIATION",
                "comment": (
                    "auto-remediation echouee: %s" % exc
                ),
                "result": {
                    "executor": action_code,
                    "automatic_execution": True,
                    "failure_kind": type(exc).__name__,
                    "error": str(exc),
                },
            },
            False,
        )
        return {
            "status": "FAILED",
            "approval_id": approval_id,
            "attempt_id": attempt_id,
            "error": str(exc),
            "attempt": failed,
        }

    completed = do_finish_remediation_attempt(
        {
            "attempt_id": attempt_id,
            "operator": "AUTO_REMEDIATION",
            "comment": "auto-remediation terminee",
            "result": {
                **result,
                "automatic_execution": True,
            },
        },
        True,
    )
    return {
        "status": "COMPLETED",
        "approval_id": approval_id,
        "attempt_id": attempt_id,
        "result": result,
        "attempt": completed,
    }


def run_auto_remediation_once():
    """Execute au plus les leases expirees explicitement allowlistees."""
    now = utc_now()
    set_auto_remediation_state(
        last_run_at=now,
        last_error="",
    )

    if not automatic_action_allowed(
        "RECOVER_NOTIFICATION_LEASE"
    ):
        return auto_remediation_scheduler_snapshot()

    if not auto_remediation_circuit_allows_execution():
        set_auto_remediation_state(last_result="CIRCUIT_OPEN")
        return {**auto_remediation_scheduler_snapshot(), "circuit_breaker": auto_remediation_circuit_snapshot()}

    path = store_path()
    candidates = []

    with locked_store(path):
        data = load_store(path)
        for item in data.get("approvals", {}).values():
            if item.get("status") != "PENDING":
                continue
            if item.get("notification_status") != "SENDING":
                continue
            lease_until = parse_utc(
                item.get("notification_lease_until", "")
            )
            if (
                lease_until is None
                or time.time() >= lease_until
            ):
                approval_id = item.get("approval_id", "")
                if approval_id:
                    candidates.append(approval_id)

    results = []
    for approval_id in candidates:
        result = execute_automatic_recover_notification_lease(
            approval_id
        )
        results.append(result)
        auto_remediation_record_result(result.get("status") == "COMPLETED")
        set_auto_remediation_state(
            last_action="RECOVER_NOTIFICATION_LEASE",
            last_approval_id=approval_id,
            last_result=result.get("status", ""),
        )

    return {
        **auto_remediation_scheduler_snapshot(),
        "candidate_count": len(candidates),
        "results": results,
    }


def auto_remediation_loop():
    """Boucle automatique volontairement limitee a une seule action."""
    while not AUTO_REMEDIATION_STOP.is_set():
        try:
            run_auto_remediation_once()
        except Exception as exc:
            set_auto_remediation_state(
                last_run_at=utc_now(),
                last_error=str(exc),
            )
            print(
                "cgpt-approval-bridge: auto-remediation en echec: %s"
                % exc,
                file=sys.stderr,
                flush=True,
            )
        AUTO_REMEDIATION_STOP.wait(
            AUTO_REMEDIATION_INTERVAL_SECONDS
        )


def start_auto_remediation_scheduler():
    AUTO_REMEDIATION_STOP.clear()

    if not AUTO_REMEDIATION_CONFIGURATION.get(
        "valid",
        False,
    ):
        set_auto_remediation_state(
            last_error="configuration_invalid",
            last_result="DISABLED_CONFIGURATION_INVALID",
        )

        journal.append_repeated_event(
            event_type="AUTO_REMEDIATION_CONFIGURATION_REJECTED",
            actor="BROKER",
            data={
                "errors": list(
                    AUTO_REMEDIATION_CONFIGURATION.get(
                        "errors",
                        [],
                    )
                ),
                "warnings": list(
                    AUTO_REMEDIATION_CONFIGURATION.get(
                        "warnings",
                        [],
                    )
                ),
                "instance_id": INSTANCE_ID,
            },
        )

        return None

    if not automatic_action_allowed(
        "RECOVER_NOTIFICATION_LEASE"
    ):
        return None
    thread = threading.Thread(
        target=auto_remediation_loop,
        name="cgpt-mcp-auto-remediation",
        daemon=True,
    )
    thread.start()
    return thread


def stop_auto_remediation_scheduler():
    AUTO_REMEDIATION_STOP.set()

def execute_recover_notification_lease(approval_id):
    """Recupere une lease de notification expiree sans renotifier.

    Cette action ne prend aucune decision metier. Elle remet seulement la
    notification dans un etat retryable et libere la lease abandonnee.
    """
    path = store_path()

    with locked_store(path):
        data = load_store(path)
        item = data.get("approvals", {}).get(approval_id)

        if item is None:
            raise ValidationError(
                "approval_id '%s' inconnu" % approval_id
            )

        if item.get("status") != "PENDING":
            raise ValidationError(
                "remediation refusee : approbation non PENDING"
            )

        if item.get("notification_status") != "SENDING":
            raise ValidationError(
                "remediation refusee : notification non SENDING"
            )

        lease_until = parse_utc(
            item.get("notification_lease_until", "")
        )

        if (
            lease_until is not None
            and time.time() < lease_until
        ):
            raise ValidationError(
                "remediation refusee : lease encore active"
            )

        previous_lease_id = item.get(
            "notification_lease_id",
            "",
        )

        item["notification_status"] = "FAILED"
        item["notification_lease_id"] = ""
        item["notification_lease_until"] = ""
        item["notification_next_retry_at"] = ""
        item["notification_updated_at"] = utc_now()

        save_store(
            path,
            data,
        )

        return {
            "approval_id": approval_id,
            "previous_lease_id": previous_lease_id,
            "notification_status": item.get(
                "notification_status"
            ),
            "notification_lease_id": item.get(
                "notification_lease_id"
            ),
            "notification_lease_until": item.get(
                "notification_lease_until"
            ),
            "notification_next_retry_at": item.get(
                "notification_next_retry_at"
            ),
        }



def execute_reconcile_pending_approval(approval_id):
    """Reprend une approbation PENDING sans prendre de decision metier.

    Une decision deja disponible chez le controleur est appliquee apres
    nouvelle validation de correlation et persistance du store. En absence
    de decision, la notification est seulement retentee via le mecanisme
    de lease existant.
    """
    path = store_path()

    with locked_store(path):
        data = load_store(path)
        item = data.get("approvals", {}).get(approval_id)
        if item is None:
            raise ValidationError("approval_id '%s' inconnu" % approval_id)
        if item.get("status") != "PENDING":
            raise ValidationError(
                "remediation refusee : approbation non PENDING"
            )
        snapshot = dict(item)

    decision = controller_decision(snapshot)

    if decision is not None:
        with locked_store(path):
            data = load_store(path)
            current = data.get("approvals", {}).get(approval_id)
            if current is None:
                raise ValidationError(
                    "approval_id '%s' disparu pendant reconciliation"
                    % approval_id
                )
            if current.get("status") != "PENDING":
                return {
                    "approval_id": approval_id,
                    "outcome": "ALREADY_TERMINAL",
                    "status": current.get("status", ""),
                    "notification_reestablished": False,
                }
            if not apply_controller_decision(current, decision):
                raise ValidationError(
                    "decision controleur refusee par correlation"
                )
            save_store(path, data)
            repair_journal_for_item(current)
            return {
                "approval_id": approval_id,
                "outcome": "DECISION_APPLIED",
                "status": current.get("status", ""),
                "decision_id": current.get("decision_id", ""),
                "notification_reestablished": False,
            }

    with locked_store(path):
        data = load_store(path)
        current = data.get("approvals", {}).get(approval_id)
        if current is None:
            raise ValidationError(
                "approval_id '%s' disparu pendant reconciliation"
                % approval_id
            )
        if current.get("status") != "PENDING":
            return {
                "approval_id": approval_id,
                "outcome": "ALREADY_TERMINAL",
                "status": current.get("status", ""),
                "notification_reestablished": False,
            }
        snapshot = dict(current)

    delivered = maybe_notify_controller(snapshot)

    with locked_store(path):
        data = load_store(path)
        current = data.get("approvals", {}).get(approval_id)
        if current is None:
            raise ValidationError(
                "approval_id '%s' disparu apres renotification"
                % approval_id
            )
        return {
            "approval_id": approval_id,
            "outcome": "NOTIFICATION_REESTABLISHED",
            "status": current.get("status", ""),
            "notification_delivered": bool(delivered),
            "notification_status": current.get(
                "notification_status", ""
            ),
            "notification_reestablished": True,
        }

def execute_retry_reconciliation():
    """Relance explicitement une reconciliation globale et verifie son resultat."""
    before = reconciliation_snapshot()
    if before.get("state") == "RUNNING":
        raise ValidationError(
            "remediation refusee : reconciliation deja active"
        )

    store = store_health_snapshot()
    if not store.get("ok"):
        raise ValidationError(
            "remediation refusee : store malsain"
        )

    journal_state = journal.journal_stats()
    if not journal_state.get("ok"):
        raise ValidationError(
            "remediation refusee : journal illisible"
        )

    integrity = journal.verify_journal()
    if not integrity.get("ok"):
        raise ValidationError(
            "remediation refusee : integrite journal invalide"
        )

    reconcile_pending_approvals()
    after = reconciliation_snapshot()

    if after.get("state") == "RUNNING":
        raise ValidationError(
            "reconciliation toujours active apres execution synchrone"
        )

    if after.get("last_error"):
        raise ValidationError(
            "reconciliation terminee avec erreur : %s"
            % after.get("last_error")
        )

    if after.get("last_started_at") == before.get("last_started_at"):
        raise ValidationError(
            "reconciliation non demarree"
        )

    return {
        "outcome": "RECONCILIATION_COMPLETED",
        "previous": before,
        "current": after,
        "last_error": after.get("last_error", ""),
    }


def execute_repair_consistency():
    """Repare uniquement les divergences de coherence non ambigues.

    Le snapshot est revalide juste avant la mutation. Toute contradiction
    ambigue ou absence de divergence sure provoque un refus immediat.
    """
    before = store_journal_consistency_snapshot()

    if before.get("checked_approvals") is None:
        raise ValidationError(
            "remediation refusee : controle de coherence impossible"
        )

    repairable, dangerous = repairable_consistency_ids(before)
    orphan = before.get("orphan_journal_approvals", [])

    if dangerous or orphan:
        raise ValidationError(
            "remediation refusee : divergence ambigue detectee"
        )

    if not repairable:
        raise ValidationError(
            "remediation refusee : aucune divergence sure a reparer"
        )

    result = do_repair_consistency()
    after = result.get("after", {})

    if result.get("human_required"):
        raise ValidationError(
            "reparation interrompue : intervention humaine requise"
        )

    if not after.get("ok"):
        raise ValidationError(
            "reparation terminee mais coherence encore invalide"
        )

    return {
        "outcome": "CONSISTENCY_REPAIRED",
        "repair_id": result.get("repair_id", ""),
        "repaired_approvals": result.get("repaired_approvals", []),
        "repaired_count": len(result.get("repaired_approvals", [])),
        "before": before,
        "after": after,
        "human_required": False,
    }


def execute_controlled_remediation(
    action_code,
    approval_id,
):
    """Execute uniquement les remediations CONTROLLED explicitement supportees."""
    if action_code not in CONTROLLED_REMEDIATION_EXECUTORS:
        raise ValidationError(
            "execution CONTROLLED non implementee pour '%s'"
            % action_code
        )

    if action_code == "RECOVER_NOTIFICATION_LEASE":
        return execute_recover_notification_lease(
            approval_id
        )

    if action_code == "RECONCILE_PENDING_APPROVALS":
        return execute_reconcile_pending_approval(
            approval_id
        )

    if action_code == "RETRY_RECONCILIATION":
        return execute_retry_reconciliation()

    if action_code == "REPAIR_CONSISTENCY":
        return execute_repair_consistency()

    raise ValidationError(
        "executeur CONTROLLED introuvable pour '%s'"
        % action_code
    )


def do_execute_controlled_remediation(args):
    """Execute manuellement une remediation CONTROLLED admissible.

    Aucun appel automatique n'utilise cette fonction. L'operateur doit
    explicitement invoquer l'outil MCP correspondant.
    """
    action_code = require_str(
        args,
        "action_code",
        100,
    )

    approval_id = optional_str(
        args,
        "approval_id",
        100,
    )

    operator = require_str(
        args,
        "operator",
        100,
    )

    comment = optional_str(
        args,
        "comment",
        1000,
    )

    if action_code not in CONTROLLED_REMEDIATION_EXECUTORS:
        raise ValidationError(
            "action non executable dans cette version : %s"
            % action_code
        )

    if (
        action_code in (
            "RECOVER_NOTIFICATION_LEASE",
            "RECONCILE_PENDING_APPROVALS",
        )
        and not approval_id
    ):
        raise ValidationError(
            "approval_id obligatoire pour cette remediation"
        )

    evaluation = evaluate_controlled_remediation(
        action_code,
        approval_id,
    )

    if evaluation.get("state") != "ELIGIBLE":
        raise ValidationError(
            "remediation non eligible: %s"
            % evaluation.get(
                "state",
                "UNKNOWN",
            )
        )

    started = do_start_remediation_attempt(
        {
            "action_code": action_code,
            "approval_id": approval_id,
            "operator": operator,
            "comment": comment,
        }
    )

    attempt_id = started[
        "attempt_id"
    ]

    try:
        #
        # Les preconditions ont ete evaluees avant STARTED.
        # L'executeur revalide aussi l'etat critique sous locked_store()
        # juste avant toute mutation.
        #
        result = execute_controlled_remediation(
            action_code,
            approval_id,
        )

    except Exception as exc:
        failure = do_finish_remediation_attempt(
            {
                "attempt_id": attempt_id,
                "operator": operator,
                "comment": (
                    "execution CONTROLLED echouee: %s"
                    % exc
                ),
                "result": {
                    "executor": action_code,
                    "failure_kind": (
                        type(exc).__name__
                    ),
                    "error": str(
                        exc
                    ),
                },
            },
            False,
        )

        return {
            "status": "FAILED",
            "action_code": action_code,
            "approval_id": approval_id,
            "attempt_id": attempt_id,
            "operator": operator,
            "automatic_execution": False,
            "manual_invocation": True,
            "failure": str(
                exc
            ),
            "attempt": failure,
        }

    completed = do_finish_remediation_attempt(
        {
            "attempt_id": attempt_id,
            "operator": operator,
            "comment": (
                comment
                or "remediation CONTROLLED executee"
            ),
            "result": result,
        },
        True,
    )

    return {
        "status": "COMPLETED",
        "action_code": action_code,
        "approval_id": approval_id,
        "attempt_id": attempt_id,
        "operator": operator,
        "automatic_execution": False,
        "manual_invocation": True,
        "result": result,
        "attempt": completed,
    }

def remediation_class_metadata(mode):
    return dict(REMEDIATION_CLASSES.get(mode, REMEDIATION_CLASSES["DIAGNOSTIC"]))


def remediation_catalog_snapshot():
    return {
        "classes": {name: dict(meta) for name, meta in REMEDIATION_CLASSES.items()},
        "policy": {
            "auto_remediation_enabled": bool(AUTO_REMEDIATION_ENABLED),
            "auto_remediation_policy_only": False,
            "auto_remediation_scheduler_enabled": automatic_action_allowed(
                "RECOVER_NOTIFICATION_LEASE"
            ),
            "auto_remediation_requested_actions": list(
                AUTO_REMEDIATION_REQUESTED_ACTIONS
            ),
            "auto_remediation_allowed_actions": (
                auto_remediation_policy_snapshot().get(
                    "allowed_actions",
                    [],
                )
            ),
            "controlled_requires_guardrails": True,
            "controlled_requires_preconditions": True,
            "controlled_requires_attempt_budget": True,
            "controlled_requires_cooldown": True,
            "controlled_requires_idempotence_scope": True,
            "controlled_escalates_to_human_required": True,
            "manual_never_automatic": True,
            "diagnostic_non_mutating": True,
            "observe_passive": True,
            "evaluation_is_read_only": True,
            "attempt_registry_persistent": True,
            "manual_attempt_execution_only": True,
            "controlled_executor_enabled": True,
            "controlled_executor_automatic": False,
            "automatic_default_deny": True,
            "automatic_requires_explicit_allowlist": True,
            "controlled_executor_actions": sorted(
                CONTROLLED_REMEDIATION_EXECUTORS
            ),
            "attempt_events": [
                "REMEDIATION_ATTEMPT_STARTED",
                "REMEDIATION_ATTEMPT_COMPLETED",
                "REMEDIATION_ATTEMPT_FAILED",
                "REMEDIATION_ATTEMPT_ORPHANED",
                "REMEDIATION_ESCALATED",
            ],
            "evaluation_states": [
                "ELIGIBLE",
                "COOLDOWN",
                "PRECONDITION_FAILED",
                "ATTEMPTS_EXHAUSTED",
                "HUMAN_REQUIRED",
            ],
        },
        "controlled_guardrails": {
            code: remediation_guardrails_for_action(code)
            for code in sorted(CONTROLLED_REMEDIATION_GUARDRAILS)
        },
    }


def recommended_action_for_root_cause(root_cause):
    """Retourne une recommandation structuree sans executer de remediaton."""
    actions = {
        "NONE": {
            "code": "NONE",
            "mode": "NONE",
            "automatic_allowed": False,
            "requires_human": False,
            "reason": "aucune action requise",
        },
        "STORE_UNHEALTHY": {
            "code": "INSPECT_STORE",
            "mode": "MANUAL",
            "automatic_allowed": False,
            "requires_human": True,
            "reason": "le magasin persistant est illisible ou invalide",
        },
        "JOURNAL_UNHEALTHY": {
            "code": "INSPECT_JOURNAL",
            "mode": "MANUAL",
            "automatic_allowed": False,
            "requires_human": True,
            "reason": "le journal est illisible ou indisponible",
        },
        "JOURNAL_INTEGRITY_FAILURE": {
            "code": "VERIFY_JOURNAL_INTEGRITY",
            "mode": "MANUAL",
            "automatic_allowed": False,
            "requires_human": True,
            "reason": "l'integrite du journal ne peut pas etre garantie",
        },
        "STORE_JOURNAL_DIVERGENCE": {
            "code": "REPAIR_CONSISTENCY",
            "mode": "CONTROLLED",
            "automatic_allowed": False,
            "requires_human": False,
            "reason": "executer d'abord le diagnostic/reparateur de coherence controle",
        },
        "WORKER_POOL_SATURATED": {
            "code": "INSPECT_WORKER_POOL",
            "mode": "DIAGNOSTIC",
            "automatic_allowed": False,
            "requires_human": False,
            "reason": "identifier les requetes longues ou bloquees avant toute relance",
        },
        "CONTROLLER_UNREACHABLE": {
            "code": "CHECK_CONTROLLER",
            "mode": "DIAGNOSTIC",
            "automatic_allowed": False,
            "requires_human": False,
            "reason": "verifier disponibilite et connectivite du controleur CGPT",
        },
        "NOTIFICATION_LEASE_STUCK": {
            "code": "RECOVER_NOTIFICATION_LEASE",
            "mode": "CONTROLLED",
            "automatic_allowed": False,
            "requires_human": False,
            "reason": "neutraliser la lease abandonnee puis renotifier si necessaire",
        },
        "CONTROLLER_DECISION_PATH_STALLED": {
            "code": "RECONCILE_PENDING_APPROVALS",
            "mode": "CONTROLLED",
            "automatic_allowed": False,
            "requires_human": False,
            "reason": "rechercher une decision existante avant toute renotification",
        },
        "DECISION_WAIT_WITHOUT_PROGRESS": {
            "code": "RECONCILE_PENDING_APPROVALS",
            "mode": "CONTROLLED",
            "automatic_allowed": False,
            "requires_human": False,
            "reason": "aucune progression metier observee malgre une session active",
        },
        "SESSION_STALLED": {
            "code": "INSPECT_SESSION_PROGRESS",
            "mode": "DIAGNOSTIC",
            "automatic_allowed": False,
            "requires_human": False,
            "reason": "identifier le dernier point de progression de la session",
        },
        "RECONCILIATION_ERROR": {
            "code": "RETRY_RECONCILIATION",
            "mode": "CONTROLLED",
            "automatic_allowed": False,
            "requires_human": False,
            "reason": "corriger la cause de l'erreur puis relancer la reconciliation",
        },
        "PENDING_WATCHDOG_ERROR": {
            "code": "INSPECT_PENDING_WATCHDOG",
            "mode": "DIAGNOSTIC",
            "automatic_allowed": False,
            "requires_human": False,
            "reason": "le watchdog PENDING ne peut pas produire un etat fiable",
        },
        "SESSION_WATCHDOG_ERROR": {
            "code": "INSPECT_SESSION_WATCHDOG",
            "mode": "DIAGNOSTIC",
            "automatic_allowed": False,
            "requires_human": False,
            "reason": "le watchdog global ne peut pas produire un etat fiable",
        },
        "SESSION_PROGRESS_DEGRADED": {
            "code": "OBSERVE_SESSION_PROGRESS",
            "mode": "OBSERVE",
            "automatic_allowed": False,
            "requires_human": False,
            "reason": "surveiller la progression avant de declencher une recuperation",
        },
    }

    action = dict(actions.get(
        root_cause,
        {
            "code": "INSPECT_DIAGNOSIS",
            "mode": "DIAGNOSTIC",
            "automatic_allowed": False,
            "requires_human": False,
            "reason": "cause racine inconnue du catalogue d'actions",
        },
    ))
    class_meta = remediation_class_metadata(action.get("mode", "DIAGNOSTIC"))
    action["class"] = action.get("mode", "DIAGNOSTIC")
    action["mutates_state"] = class_meta["mutates_state"]
    action["future_automation_eligible"] = class_meta["future_automation_eligible"]
    action["guardrails_required"] = action["class"] == "CONTROLLED"
    if action["class"] == "CONTROLLED":
        action["guardrails"] = remediation_guardrails_for_action(
            action.get("code", "")
        )
        action["future_automation_eligible"] = (
            action["future_automation_eligible"]
            and action["guardrails"].get("defined", False)
        )
    else:
        action["guardrails"] = {
            "defined": False,
            "not_applicable": True,
        }
    action["automatic_policy_allowed"] = automatic_action_allowed(
        action.get("code", "")
    )
    action["automatic_scheduler_enabled"] = False
    action["automatic_execution_active"] = False
    action["policy"] = (
        "AUTO_REMEDIATION_POLICY_ENABLED"
        if AUTO_REMEDIATION_ENABLED
        else "ADVISORY_ONLY"
    )
    return action


def classify_root_cause(
    store,
    journal_state,
    journal_integrity,
    consistency,
    controller_ok,
    reconciliation,
    pending_watchdog,
    session_watchdog,
    control,
    fast,
    blocking,
):
    """Produit un diagnostic synthetique sans modifier l'etat metier."""
    factors = []

    def add(code, severity, detail=""):
        factors.append({
            "code": code,
            "severity": severity,
            "detail": detail,
        })

    if not store.get("ok", False):
        add("STORE_UNHEALTHY", "CRITICAL", store.get("error", ""))

    if not journal_state.get("ok", False):
        add("JOURNAL_UNHEALTHY", "CRITICAL", journal_state.get("error", ""))

    if not journal_integrity.get("ok", False):
        add(
            "JOURNAL_INTEGRITY_FAILURE",
            "CRITICAL",
            journal_integrity.get("error", ""),
        )

    if not consistency.get("ok", False):
        add("STORE_JOURNAL_DIVERGENCE", "CRITICAL", "consistency_check_failed")

    saturated = []
    for name, snapshot in (
        ("CONTROL", control),
        ("FAST", fast),
        ("BLOCKING", blocking),
    ):
        if pool_is_saturated(snapshot):
            saturated.append(name)
    if saturated:
        add("WORKER_POOL_SATURATED", "CRITICAL", ",".join(saturated))

    if not controller_ok:
        add("CONTROLLER_UNREACHABLE", "CRITICAL", controller_url())

    pending_states = pending_watchdog.get("approvals", {})
    state_values = [value.get("state", "") for value in pending_states.values()]
    reasons = [value.get("reason", "") for value in pending_states.values()]

    if "STALLED_NOTIFICATION" in state_values:
        detail = "notification_lease_or_retry_stalled"
        if "notification_lease_expired" in reasons:
            detail = "notification_lease_expired"
        add("NOTIFICATION_LEASE_STUCK", "CRITICAL", detail)

    if "STALLED_CONTROLLER" in state_values:
        add("CONTROLLER_DECISION_PATH_STALLED", "CRITICAL", "pending_watchdog")

    if pending_watchdog.get("last_error"):
        add("PENDING_WATCHDOG_ERROR", "WARNING", pending_watchdog.get("last_error", ""))

    if reconciliation.get("last_error"):
        add("RECONCILIATION_ERROR", "WARNING", reconciliation.get("last_error", ""))

    session_state = session_watchdog.get("state", "")
    session_reason = session_watchdog.get("reason", "")
    if session_state == "STALLED" and not any(
        factor["severity"] == "CRITICAL" for factor in factors
    ):
        if session_reason == "no_global_progress":
            add("DECISION_WAIT_WITHOUT_PROGRESS", "CRITICAL", session_reason)
        else:
            add("SESSION_STALLED", "CRITICAL", session_reason)
    elif session_state == "DEGRADED":
        add("SESSION_PROGRESS_DEGRADED", "WARNING", session_reason)

    if session_watchdog.get("last_error"):
        add("SESSION_WATCHDOG_ERROR", "WARNING", session_watchdog.get("last_error", ""))

    priority = [
        "STORE_UNHEALTHY",
        "JOURNAL_UNHEALTHY",
        "JOURNAL_INTEGRITY_FAILURE",
        "STORE_JOURNAL_DIVERGENCE",
        "WORKER_POOL_SATURATED",
        "CONTROLLER_UNREACHABLE",
        "NOTIFICATION_LEASE_STUCK",
        "CONTROLLER_DECISION_PATH_STALLED",
        "DECISION_WAIT_WITHOUT_PROGRESS",
        "SESSION_STALLED",
        "RECONCILIATION_ERROR",
        "PENDING_WATCHDOG_ERROR",
        "SESSION_WATCHDOG_ERROR",
        "SESSION_PROGRESS_DEGRADED",
    ]

    root_cause = "NONE"
    for code in priority:
        if any(factor["code"] == code for factor in factors):
            root_cause = code
            break

    if root_cause == "NONE":
        status = "HEALTHY"
    elif any(factor["severity"] == "CRITICAL" for factor in factors):
        status = "STALLED" if session_state == "STALLED" else "DEGRADED"
    else:
        status = "DEGRADED"

    return {
        "status": status,
        "root_cause": root_cause,
        "recommended_action": recommended_action_for_root_cause(root_cause),
        "contributing_factors": factors,
        "diagnosed_at": utc_now(),
    }


def update_root_cause_state(diagnosis):
    """Memorise et journalise uniquement un changement de cause racine."""
    with ROOT_CAUSE_LOCK:
        previous = ROOT_CAUSE_STATE.get("root_cause", "NONE")

    current = diagnosis.get("root_cause", "NONE")
    if previous != current:
        journal.append_unique_event(
            event_type="BROKER_ROOT_CAUSE_CHANGED",
            event_key=root_cause_event_key(current),
            actor="BROKER",
            data={
                "previous_root_cause": previous,
                **diagnosis,
            },
        )

    with ROOT_CAUSE_LOCK:
        ROOT_CAUSE_STATE.clear()
        ROOT_CAUSE_STATE.update(diagnosis)

    return dict(diagnosis)


def root_cause_snapshot():
    with ROOT_CAUSE_LOCK:
        return dict(ROOT_CAUSE_STATE)


def do_health():
    store = store_health_snapshot()

    journal_state = journal.journal_stats()

    try:
        journal_integrity = (
            journal.verify_journal()
        )

    except journal.JournalError as exc:
        journal_integrity = {
            "ok": False,
            "error": str(
                exc
            ),
        }

    consistency = store_journal_consistency_snapshot()

    controller_ok = (
        controller_tcp_reachable()
    )

    session_watchdog = session_watchdog_snapshot()
    session_state = session_watchdog.get(
        "state",
        "",
    )

    reconciliation = reconciliation_snapshot()
    pending_watchdog = pending_watchdog_snapshot()
    control = control_snapshot()
    fast = fast_snapshot()
    blocking = blocking_snapshot()

    diagnosis = classify_root_cause(
        store=store,
        journal_state=journal_state,
        journal_integrity=journal_integrity,
        consistency=consistency,
        controller_ok=controller_ok,
        reconciliation=reconciliation,
        pending_watchdog=pending_watchdog,
        session_watchdog=session_watchdog,
        control=control,
        fast=fast,
        blocking=blocking,
    )
    try:
        update_root_cause_state(diagnosis)
    except (journal.JournalError, journal.JournalValidationError):
        pass

    healthy = (
        store.get(
            "ok"
        )
        and journal_state.get(
            "ok"
        )
        and journal_integrity.get(
            "ok"
        )
        and consistency.get(
            "ok"
        )
        and controller_ok
        and session_state in (
            "",
            "IDLE",
            "ACTIVE",
        )
        and diagnosis.get("root_cause") == "NONE"
    )

    return {
        "status": (
            "OK"
            if healthy
            else "DEGRADED"
        ),
        "server": {
            "name": SERVER_NAME,
            "version": SERVER_VERSION,
            "protocol_version": (
                MCP_PROTOCOL_VERSION
            ),
            "pid": os.getpid(),
            "started_at": PROCESS_STARTED_AT,
        },
        "instance": {
            **instance_snapshot(),
            "lifecycle_events": [
                "BROKER_INSTANCE_STARTED",
                "BROKER_INSTANCE_STOPPING",
                "BROKER_INSTANCE_STOPPED",
                "BROKER_INSTANCE_RECOVERED_STALE_METADATA",
                "BROKER_INSTANCE_UNCLEAN_SHUTDOWN_DETECTED",
                "BROKER_CRASH_RECOVERY_STARTED",
                "BROKER_CRASH_RECOVERY_LEASE_RESET",
                "BROKER_CRASH_RECOVERY_COMPLETED",
                "BROKER_CRASH_RECOVERY_DECISION_APPLIED",
                "BROKER_CRASH_RECOVERY_RENOTIFIED",
            ],
        },
        "store": store,
        "journal": {
            **journal_state,
            "integrity": journal_integrity,
            "business_events": [
                "APPROVAL_CREATED",
                "APPROVAL_APPROVED",
                "APPROVAL_REJECTED",
                "APPROVAL_NEEDS_CLARIFICATION",
                "APPROVAL_CANCELLED",
                "APPROVAL_EXPIRED",
            ],
            "technical_events": [
                "CONTROLLER_NOTIFICATION_ATTEMPTED",
                "CONTROLLER_NOTIFICATION_DELIVERED",
                "CONTROLLER_NOTIFICATION_FAILED",
                "CONTROLLER_DECISION_POLLING_STARTED",
                "CONTROLLER_DECISION_NOT_AVAILABLE",
                "CONTROLLER_DECISION_HTTP_ERROR",
                "CONTROLLER_DECISION_TRANSPORT_FAILED",
                "CONTROLLER_DECISION_INVALID_RESPONSE",
                "CONTROLLER_DECISION_RECEIVED",
                (
                    "CONTROLLER_DECISION_"
                    "REJECTED_CORRELATION"
                ),
                "PENDING_WATCHDOG_STATE_CHANGED",
                "PENDING_WATCHDOG_STALLED",
                "SESSION_WATCHDOG_STATE_CHANGED",
                "SESSION_WATCHDOG_STALLED",
                "BROKER_ROOT_CAUSE_CHANGED",
            ],
        },
        "consistency": consistency,
        "repair_policy": {
            "automatic": [
                "missing_created_events",
                "missing_terminal_events",
            ],
            "never_automatic": [
                "pending_with_terminal_event",
                "terminal_status_mismatches",
                "multiple_terminal_events",
                "orphan_journal_approvals",
            ],
        },
        "controller": {
            "url": controller_url(),
            "tcp_reachable": (
                controller_ok
            ),
        },
        "reconciliation": reconciliation,
        "pending_watchdog": pending_watchdog,
        "session_watchdog": session_watchdog,
        "diagnosis": diagnosis,
        "remediation_catalog": remediation_catalog_snapshot(),
        "auto_remediation": auto_remediation_policy_snapshot(),
        "requests": {
            "active_transport_requests": (
                active_requests_count()
            ),
        },
        "control": control,
        "fast": fast,
        "blocking": blocking,
    }



def consistency_requires_human(consistency):
    """Indique si la divergence de coherence est ambigue."""
    return any((
        consistency.get("pending_with_terminal_event"),
        consistency.get("terminal_status_mismatches"),
        consistency.get("multiple_terminal_events"),
        consistency.get("orphan_journal_approvals"),
    ))


def readiness_auto_recovery_available(health):
    """Indique si une auto-recuperation est admissible maintenant."""
    diagnosis = health.get("diagnosis", {})
    action = diagnosis.get("recommended_action", {})
    action_code = action.get("code", "")

    if not action_code or action_code == "NONE":
        return False

    if not automatic_action_allowed(action_code):
        return False

    # En v0.60, seul RECOVER_NOTIFICATION_LEASE est ordonnance automatiquement.
    if action_code != "RECOVER_NOTIFICATION_LEASE":
        return False

    approvals = health.get("pending_watchdog", {}).get("approvals", {})

    for approval_id, item in approvals.items():
        if item.get("state") != "STALLED_NOTIFICATION":
            continue

        try:
            evaluation = evaluate_controlled_remediation(
                action_code,
                approval_id,
            )
        except (ValidationError, StoreError, journal.JournalError):
            continue

        if evaluation.get("state") == "ELIGIBLE":
            return True

    return False


def readiness_human_required(health):
    """Determine si l'etat courant exige explicitement un humain."""
    diagnosis = health.get("diagnosis", {})
    action = diagnosis.get("recommended_action", {})

    if action.get("requires_human", False):
        return True

    consistency = health.get("consistency", {})
    if consistency_requires_human(consistency):
        return True

    action_code = action.get("code", "")
    if action_code in CONTROLLED_REMEDIATION_GUARDRAILS:
        if action_code == "RECOVER_NOTIFICATION_LEASE":
            approvals = health.get("pending_watchdog", {}).get("approvals", {})
            for approval_id, item in approvals.items():
                if item.get("state") != "STALLED_NOTIFICATION":
                    continue
                try:
                    evaluation = evaluate_controlled_remediation(
                        action_code,
                        approval_id,
                    )
                except (ValidationError, StoreError, journal.JournalError):
                    continue
                if evaluation.get("state") == "HUMAN_REQUIRED":
                    return True
        elif action_code in ("REPAIR_CONSISTENCY", "RETRY_RECONCILIATION"):
            try:
                evaluation = evaluate_controlled_remediation(action_code, "")
            except (ValidationError, StoreError, journal.JournalError):
                evaluation = {}
            if evaluation.get("state") == "HUMAN_REQUIRED":
                return True

    return False


def classify_readiness_status(health, human_required, auto_recovery_available):
    """Mappe l'etat detaille vers le contrat stable de readiness."""
    if human_required:
        return "HUMAN_REQUIRED"

    diagnosis = health.get("diagnosis", {})
    root_cause = diagnosis.get("root_cause", "NONE")
    session_state = health.get("session_watchdog", {}).get("state", "")

    blocking_causes = {
        "STORE_UNHEALTHY",
        "JOURNAL_UNHEALTHY",
        "JOURNAL_INTEGRITY_FAILURE",
        "WORKER_POOL_SATURATED",
        "CONTROLLER_UNREACHABLE",
        "CONTROLLER_DECISION_PATH_STALLED",
        "DECISION_WAIT_WITHOUT_PROGRESS",
        "SESSION_STALLED",
    }

    if root_cause in blocking_causes:
        if auto_recovery_available:
            return "DEGRADED"
        return "BLOCKED"

    if session_state == "STALLED":
        if auto_recovery_available:
            return "DEGRADED"
        return "BLOCKED"

    if health.get("status") != "OK" or root_cause != "NONE":
        return "DEGRADED"

    return "READY"


def do_readiness():
    """Expose un snapshot compact et stable pour /poc test et heartbeat."""
    health = do_health()

    diagnosis = health.get("diagnosis", {})
    action = diagnosis.get("recommended_action", {})
    pending_watchdog = health.get("pending_watchdog", {})
    controller = health.get("controller", {})
    auto_policy = health.get("auto_remediation", {})

    human_required = readiness_human_required(health)
    auto_recovery_available = readiness_auto_recovery_available(health)
    status = classify_readiness_status(
        health,
        human_required,
        auto_recovery_available,
    )

    approvals = pending_watchdog.get("approvals", {})
    stalled_count = pending_watchdog.get("stalled_count")
    if stalled_count is None:
        stalled_count = sum(
            1
            for value in approvals.values()
            if str(value.get("state", "")).startswith("STALLED_")
        )

    pending_count = pending_watchdog.get("pending_count")
    if pending_count is None:
        pending_count = len(approvals)

    return {
        "schema_version": 1,
        "status": status,
        "ready": status == "READY",
        "server_version": SERVER_VERSION,
        "instance_id": INSTANCE_ID,
        "root_cause": diagnosis.get("root_cause", "NONE"),
        "recommended_action": {
            "code": action.get("code", "NONE"),
            "class": action.get("class", action.get("mode", "NONE")),
            "requires_human": bool(action.get("requires_human", False)),
        },
        "human_required": human_required,
        "auto_recovery_available": auto_recovery_available,
        "auto_remediation_enabled": bool(auto_policy.get("enabled", False)),
        "auto_remediation_configuration_valid": bool(
            auto_policy.get("configuration_valid", True)
        ),
        "controller_reachable": bool(controller.get("tcp_reachable", False)),
        "pending_count": int(pending_count or 0),
        "stalled_count": int(stalled_count or 0),
        "session_state": health.get("session_watchdog", {}).get("state", ""),
        "circuit_breaker_state": (
            auto_policy.get("scheduler", {})
            .get("circuit_breaker", {})
            .get("state", "")
        ),
        "checked_at": utc_now(),
    }

def publish_readiness_to_controller():
    """Publie le snapshot readiness au controleur local."""
    snapshot = do_readiness()
    endpoint = controller_url() + "/broker/readiness"
    payload = json.dumps(snapshot, ensure_ascii=False).encode("utf-8")
    http_request = request.Request(
        endpoint, data=payload,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        with request.urlopen(http_request, timeout=2) as response:
            return 200 <= response.status < 300
    except (error.URLError, error.HTTPError, OSError):
        return False


def readiness_publish_loop():
    while not READINESS_PUBLISH_STOP.is_set():
        try:
            publish_readiness_to_controller()
        except Exception as exc:
            print(
                "cgpt-approval-bridge: publication readiness en echec: %s" % exc,
                file=sys.stderr, flush=True,
            )
        READINESS_PUBLISH_STOP.wait(READINESS_PUBLISH_INTERVAL_SECONDS)


def start_readiness_publisher():
    READINESS_PUBLISH_STOP.clear()
    thread = threading.Thread(
        target=readiness_publish_loop,
        name="cgpt-mcp-readiness-publisher",
        daemon=True,
    )
    thread.start()
    return thread


def stop_readiness_publisher():
    READINESS_PUBLISH_STOP.set()


def reconcile_pending_approvals():
    global RECONCILIATION_RUNNING
    global RECONCILIATION_LAST_STARTED_AT
    global RECONCILIATION_LAST_FINISHED_AT
    global RECONCILIATION_LAST_ERROR

    with RECONCILIATION_LOCK:
        if RECONCILIATION_RUNNING:
            return

        RECONCILIATION_RUNNING = True
        RECONCILIATION_LAST_STARTED_AT = utc_now()
        RECONCILIATION_LAST_ERROR = ""

    try:
        path = store_path()
        pending_items = []

        with locked_store(
            path
        ):
            data = load_store(
                path
            )

            approvals = data[
                "approvals"
            ]

            unique, duplicate = (
                check_request_id_uniqueness(
                    approvals
                )
            )

            if not unique:
                raise StoreError(
                    "requestId duplique pendant "
                    "reconciliation : %s"
                    % duplicate
                )

            changed = False

            for item in approvals.values():
                if check_expired(
                    item
                ):
                    changed = True

                if (
                    item.get(
                        "notification_status"
                    )
                    == "SENDING"
                    and not notification_lease_active(
                        item
                    )
                ):
                    item[
                        "notification_status"
                    ] = "FAILED"

                    item[
                        "notification_lease_id"
                    ] = ""

                    item[
                        "notification_lease_until"
                    ] = ""

                    item[
                        "notification_next_retry_at"
                    ] = ""

                    changed = True

            #
            # Persistance avant toute reparation du journal.
            #
            if changed:
                save_store(
                    path,
                    data,
                )

            for item in approvals.values():
                repair_journal_for_item(
                    item
                )

                if item.get(
                    "status"
                ) == "PENDING":
                    approval_id = item.get(
                        "approval_id"
                    )

                    if approval_id:
                        pending_items.append(
                            dict(
                                item
                            )
                        )

        for snapshot in pending_items:
            approval_id = snapshot.get(
                "approval_id"
            )

            if not approval_id:
                continue

            decision = controller_decision(
                snapshot
            )

            applied = False

            if decision is not None:
                with locked_store(
                    path
                ):
                    data = load_store(
                        path
                    )

                    current = data[
                        "approvals"
                    ].get(
                        approval_id
                    )

                    if (
                        current is not None
                        and current.get(
                            "status"
                        )
                        == "PENDING"
                    ):
                        if apply_controller_decision(
                            current,
                            decision,
                        ):
                            current[
                                "reconciled_at"
                            ] = utc_now()

                            save_store(
                                path,
                                data,
                            )

                            repair_journal_for_item(
                                current
                            )

                            applied = True

            if applied:
                continue

            with locked_store(
                path
            ):
                data = load_store(
                    path
                )

                current = data[
                    "approvals"
                ].get(
                    approval_id
                )

                snapshot = (
                    dict(
                        current
                    )
                    if (
                        current is not None
                        and current.get(
                            "status"
                        )
                        == "PENDING"
                    )
                    else None
                )

            if snapshot is not None:
                maybe_notify_controller(
                    snapshot
                )

    except Exception as exc:
        with RECONCILIATION_LOCK:
            RECONCILIATION_LAST_ERROR = str(
                exc
            )

        print(
            (
                "cgpt-approval-bridge: "
                "reconciliation en echec: %s"
                % exc
            ),
            file=sys.stderr,
            flush=True,
        )

    finally:
        with RECONCILIATION_LOCK:
            RECONCILIATION_RUNNING = False
            RECONCILIATION_LAST_FINISHED_AT = utc_now()


def start_background_reconciliation():
    thread = threading.Thread(
        target=reconcile_pending_approvals,
        name="cgpt-mcp-reconciliation",
        daemon=True,
    )

    thread.start()

    return thread


APPROVAL_REQUEST_PROPERTIES = {
    "change_id": {
        "type": "string",
    },
    "title": {
        "type": "string",
    },
    "files": {
        "type": "array",
        "items": {
            "type": "string",
        },
    },
    "summary": {
        "type": "string",
    },
    "approval_id": {
        "type": "string",
    },
    "requestId": {
        "type": "string",
    },
    "session_id": {
        "type": "string",
    },
    "directory": {
        "type": "string",
    },
    "commands": {
        "type": "array",
        "items": {
            "type": "string",
        },
    },
    "ttl_seconds": {
        "type": "integer",
    },
}


TOOLS = [
    {
        "name": "request_validation",
        "description": (
            "Cree ou retrouve une validation "
            "et attend sa decision."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                **APPROVAL_REQUEST_PROPERTIES,
                "timeout_seconds": {
                    "type": "integer",
                },
                "interval_seconds": {
                    "type": "integer",
                },
            },
            "required": [
                "change_id",
                "title",
                "files",
            ],
        },
    },
    {
        "name": "propose_approval",
        "description": (
            "Cree ou retrouve une demande "
            "sans attendre."
        ),
        "inputSchema": {
            "type": "object",
            "properties": (
                APPROVAL_REQUEST_PROPERTIES
            ),
            "required": [
                "change_id",
                "title",
                "files",
            ],
        },
    },
    {
        "name": "poll_approval",
        "description": (
            "Attend une decision via approval_id."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "approval_id": {
                    "type": "string",
                },
                "timeout_seconds": {
                    "type": "integer",
                },
                "interval_seconds": {
                    "type": "integer",
                },
            },
            "required": [
                "approval_id",
            ],
        },
    },
    {
        "name": "get_approval",
        "description": (
            "Lit une approbation via approval_id."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "approval_id": {
                    "type": "string",
                },
            },
            "required": [
                "approval_id",
            ],
        },
    },
    {
        "name": "list_pending",
        "description": "Liste les demandes.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                },
                "limit": {
                    "type": "integer",
                },
            },
        },
    },
    {
        "name": "broker_health",
        "description": (
            "Expose l'etat du broker, "
            "du magasin et du journal."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "broker_readiness",
        "description": (
            "Expose un snapshot compact de readiness pour /poc test "
            "et le heartbeat."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "broker_remediation_registry",
        "description": (
            "Expose le registre persistant des tentatives de remediation."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "action_code": {"type": "string"},
                "scope_key": {"type": "string"},
            },
        },
    },
    {
        "name": "broker_start_remediation_attempt",
        "description": (
            "Enregistre le demarrage manuel d'une remediation CONTROLLED eligible."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "action_code": {"type": "string"},
                "approval_id": {"type": "string"},
                "operator": {"type": "string"},
                "comment": {"type": "string"},
            },
            "required": ["action_code", "operator"],
        },
    },
    {
        "name": "broker_complete_remediation_attempt",
        "description": "Cloture manuellement une tentative en succes.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "attempt_id": {"type": "string"},
                "operator": {"type": "string"},
                "comment": {"type": "string"},
                "result": {"type": "object"},
            },
            "required": ["attempt_id", "operator"],
        },
    },
    {
        "name": "broker_fail_remediation_attempt",
        "description": "Cloture manuellement une tentative en echec.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "attempt_id": {"type": "string"},
                "operator": {"type": "string"},
                "comment": {"type": "string"},
                "result": {"type": "object"},
            },
            "required": ["attempt_id", "operator"],
        },
    },
    {
        "name": "broker_auto_remediation_policy",
        "description": (
            "Expose en lecture seule la politique globale et l'allowlist "
            "d'auto-remediation. Aucun ordonnanceur automatique n'est actif."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "broker_execute_controlled_remediation",
        "description": (
            "Execute manuellement une remediation CONTROLLED supportee "
            "apres evaluation des garde-fous."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "action_code": {"type": "string"},
                "approval_id": {"type": "string"},
                "operator": {"type": "string"},
                "comment": {"type": "string"},
            },
            "required": [
                "action_code",
                "operator",
            ],
        },
    },
    {
        "name": "broker_evaluate_remediation",
        "description": (
            "Evalue en lecture seule les garde-fous "
            "d'une remediation CONTROLLED."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "action_code": {
                    "type": "string",
                },
                "approval_id": {
                    "type": "string",
                },
            },
            "required": [
                "action_code",
            ],
        },
    },
    {
        "name": "broker_repair_consistency",
        "description": (
            "Repare uniquement les divergences "
            "magasin/journal non ambigues."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "broker_rotate_journal_checkpoint",
        "description": (
            "Resigne le checkpoint du journal avec "
            "la cle HMAC primaire configuree."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "approve",
        "description": (
            "Approuve une demande PENDING."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "approval_id": {
                    "type": "string",
                },
                "reviewer": {
                    "type": "string",
                },
                "comment": {
                    "type": "string",
                },
            },
            "required": [
                "approval_id",
                "reviewer",
            ],
        },
    },
    {
        "name": "reject",
        "description": (
            "Rejette une demande PENDING."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "approval_id": {
                    "type": "string",
                },
                "reviewer": {
                    "type": "string",
                },
                "comment": {
                    "type": "string",
                },
            },
            "required": [
                "approval_id",
                "reviewer",
            ],
        },
    },
    {
        "name": "cancel_approval",
        "description": (
            "Annule une approbation PENDING."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "approval_id": {
                    "type": "string",
                },
            },
            "required": [
                "approval_id",
            ],
        },
    },
]


def ok_result(
    request_id,
    result,
):
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "result": result,
    }


def ok_tools_call(payload):
    return {
        "content": [
            {
                "type": "text",
                "text": json.dumps(
                    payload,
                    ensure_ascii=False,
                ),
            }
        ],
    }


def err_result(
    request_id,
    code,
    message,
):
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "error": {
            "code": code,
            "message": message,
        },
    }


def valid_jsonrpc_id(value):
    if value is None:
        return True

    if isinstance(
        value,
        bool,
    ):
        return False

    return isinstance(
        value,
        (
            str,
            int,
            float,
        ),
    )


def validate_jsonrpc_message(message):
    if not isinstance(
        message,
        dict,
    ):
        return (
            False,
            err_result(
                None,
                -32600,
                "Invalid Request: objet JSON attendu",
            ),
        )

    if message.get(
        "jsonrpc"
    ) != "2.0":
        request_id = message.get(
            "id"
        )

        if not valid_jsonrpc_id(
            request_id
        ):
            request_id = None

        return (
            False,
            err_result(
                request_id,
                -32600,
                "jsonrpc doit valoir '2.0'",
            ),
        )

    method = message.get(
        "method"
    )

    if (
        not isinstance(
            method,
            str,
        )
        or not method
    ):
        return (
            False,
            err_result(
                message.get(
                    "id"
                ),
                -32600,
                "method invalide",
            ),
        )

    if (
        "id" in message
        and not valid_jsonrpc_id(
            message.get(
                "id"
            )
        )
    ):
        return (
            False,
            err_result(
                None,
                -32600,
                "id JSON-RPC invalide",
            ),
        )

    if (
        "params" in message
        and message[
            "params"
        ] is not None
        and not isinstance(
            message[
                "params"
            ],
            dict,
        )
    ):
        return (
            False,
            err_result(
                message.get(
                    "id"
                ),
                -32602,
                "params doit etre un objet",
            ),
        )

    return (
        True,
        None,
    )


def is_notification(req):
    return (
        isinstance(
            req,
            dict,
        )
        and "id" not in req
    )


def validate_mcp_request(req):
    method = req.get(
        "method"
    )

    if is_notification(
        req
    ):
        if method in KNOWN_NOTIFICATIONS:
            return (
                True,
                None,
            )

        return (
            False,
            None,
        )

    if method in KNOWN_NOTIFICATIONS:
        return (
            False,
            err_result(
                req.get(
                    "id"
                ),
                -32600,
                "notification avec id interdite",
            ),
        )

    if method == "tools/call":
        params = (
            req.get(
                "params"
            )
            or {}
        )

        name = params.get(
            "name"
        )

        if (
            not isinstance(
                name,
                str,
            )
            or not name
        ):
            return (
                False,
                err_result(
                    req.get(
                        "id"
                    ),
                    -32602,
                    "tools/call name obligatoire",
                ),
            )

        arguments = params.get(
            "arguments",
            {},
        )

        if (
            arguments is not None
            and not isinstance(
                arguments,
                dict,
            )
        ):
            return (
                False,
                err_result(
                    req.get(
                        "id"
                    ),
                    -32602,
                    "arguments doit etre un objet",
                ),
            )

    return (
        True,
        None,
    )


def register_active_request(
    request_id,
):
    if request_id is None:
        return None

    event = threading.Event()

    with ACTIVE_REQUESTS_LOCK:
        if request_id in ACTIVE_REQUESTS:
            raise DuplicateRequestId(
                "id JSON-RPC deja actif : %s"
                % request_id
            )

        ACTIVE_REQUESTS[
            request_id
        ] = event

    return event


def unregister_active_request(
    request_id,
    event,
):
    if (
        request_id is None
        or event is None
    ):
        return

    with ACTIVE_REQUESTS_LOCK:
        if (
            ACTIVE_REQUESTS.get(
                request_id
            )
            is event
        ):
            ACTIVE_REQUESTS.pop(
                request_id,
                None,
            )


def cancel_active_request(
    request_id,
):
    if request_id is None:
        return False

    with ACTIVE_REQUESTS_LOCK:
        event = ACTIVE_REQUESTS.get(
            request_id
        )

    if event is None:
        return False

    event.set()

    return True


def handle_cancel_notification(req):
    params = (
        req.get(
            "params"
        )
        or {}
    )

    request_id = params.get(
        "requestId"
    )

    if (
        request_id is None
        or not valid_jsonrpc_id(
            request_id
        )
    ):
        return False

    return cancel_active_request(
        request_id
    )


def handle_notification(req):
    if req.get(
        "method"
    ) == "notifications/cancelled":
        handle_cancel_notification(
            req
        )


def handle_request(
    req,
    cancel_event=None,
):
    jsonrpc_id = req.get(
        "id"
    )

    method = req.get(
        "method"
    )

    params = (
        req.get(
            "params"
        )
        or {}
    )

    try:
        if method == "initialize":
            return ok_result(
                jsonrpc_id,
                {
                    "protocolVersion": (
                        MCP_PROTOCOL_VERSION
                    ),
                    "capabilities": {
                        "tools": {
                            "listChanged": False,
                        },
                    },
                    "serverInfo": {
                        "name": SERVER_NAME,
                        "version": SERVER_VERSION,
                    },
                },
            )

        if method == "ping":
            return ok_result(
                jsonrpc_id,
                {},
            )

        if method == "tools/list":
            return ok_result(
                jsonrpc_id,
                {
                    "tools": TOOLS,
                },
            )

        if method != "tools/call":
            return err_result(
                jsonrpc_id,
                -32601,
                "methode inconnue : %s"
                % method,
            )

        name = params.get(
            "name"
        )

        args = (
            params.get(
                "arguments"
            )
            or {}
        )

        if name == "request_validation":
            payload = do_request_validation(
                args,
                cancel_event,
            )

        elif name == "poll_approval":
            payload = do_poll(
                args,
                cancel_event,
            )

        elif name == "propose_approval":
            payload = do_propose(
                args
            )

        elif name == "get_approval":
            payload = do_get(
                args
            )

        elif name == "list_pending":
            payload = do_list(
                args
            )

        elif name == "broker_health":
            payload = do_health()

        elif name == "broker_readiness":
            payload = do_readiness()

        elif name == "broker_remediation_registry":
            payload = do_remediation_registry(args)

        elif name == "broker_start_remediation_attempt":
            payload = do_start_remediation_attempt(args)

        elif name == "broker_complete_remediation_attempt":
            payload = do_finish_remediation_attempt(args, True)

        elif name == "broker_fail_remediation_attempt":
            payload = do_finish_remediation_attempt(args, False)

        elif name == "broker_auto_remediation_policy":
            payload = auto_remediation_policy_snapshot()

        elif name == "broker_execute_controlled_remediation":
            payload = do_execute_controlled_remediation(args)

        elif name == "broker_evaluate_remediation":
            payload = do_evaluate_remediation(args)

        elif name == "broker_repair_consistency":
            payload = do_repair_consistency()

        elif name == "broker_rotate_journal_checkpoint":
            payload = journal.rotate_checkpoint()

        elif name == "approve":
            payload = do_decide(
                args,
                "APPROVED",
            )

        elif name == "reject":
            payload = do_decide(
                args,
                "REJECTED",
            )

        elif name == "cancel_approval":
            payload = do_cancel(
                args
            )

        else:
            return err_result(
                jsonrpc_id,
                -32601,
                "outil inconnu : %s"
                % name,
            )

        return ok_result(
            jsonrpc_id,
            ok_tools_call(
                payload
            ),
        )

    except RequestCancelled:
        raise

    except ValidationError as exc:
        return err_result(
            jsonrpc_id,
            -32602,
            str(
                exc
            ),
        )

    except StoreError as exc:
        return err_result(
            jsonrpc_id,
            -32000,
            str(
                exc
            ),
        )

    except (
        journal.JournalError,
        journal.JournalValidationError,
    ) as exc:
        return err_result(
            jsonrpc_id,
            -32002,
            "journal : %s"
            % exc,
        )

    except Exception as exc:
        return err_result(
            jsonrpc_id,
            -32603,
            "erreur interne : %s"
            % exc,
        )


def write_response(response):
    if response is None:
        return

    note_session_activity("mcp")

    payload = (
        json.dumps(
            response,
            ensure_ascii=False,
        )
        + "\n"
    )

    with OUTPUT_LOCK:
        sys.stdout.write(
            payload
        )

        sys.stdout.flush()


def process_request(
    req,
    cancel_event,
):
    jsonrpc_id = req.get(
        "id"
    )

    response = None
    cancelled = False

    try:
        response = handle_request(
            req,
            cancel_event,
        )

    except RequestCancelled:
        cancelled = True

    except Exception as exc:
        response = err_result(
            jsonrpc_id,
            -32603,
            "erreur worker : %s"
            % exc,
        )

    finally:
        if (
            cancel_event is not None
            and cancel_event.is_set()
        ):
            cancelled = True

        unregister_active_request(
            jsonrpc_id,
            cancel_event,
        )

    if not cancelled:
        write_response(
            response
        )


def process_control_request(
    req,
    cancel_event,
):
    try:
        process_request(
            req,
            cancel_event,
        )

    finally:
        control_decrement()
        CONTROL_CAPACITY.release()


def process_fast_request(
    req,
    cancel_event,
):
    try:
        process_request(
            req,
            cancel_event,
        )

    finally:
        fast_decrement()
        FAST_CAPACITY.release()


def process_blocking_request(
    req,
    cancel_event,
):
    try:
        process_request(
            req,
            cancel_event,
        )

    finally:
        blocking_decrement()
        BLOCKING_CAPACITY.release()


def tool_name_from_request(req):
    if (
        not isinstance(
            req,
            dict,
        )
        or req.get(
            "method"
        )
        != "tools/call"
    ):
        return ""

    params = (
        req.get(
            "params"
        )
        or {}
    )

    name = params.get(
        "name",
        "",
    )

    return (
        name
        if isinstance(
            name,
            str,
        )
        else ""
    )


def is_direct_control_request(req):
    return (
        isinstance(
            req,
            dict,
        )
        and req.get(
            "method"
        )
        in DIRECT_CONTROL_METHODS
    )


def cancel_all_active_requests():
    with ACTIVE_REQUESTS_LOCK:
        events = list(
            ACTIVE_REQUESTS.values()
        )

    for event in events:
        event.set()


def reject_busy_request(
    jsonrpc_id,
    queue_name,
):
    return err_result(
        jsonrpc_id,
        -32001,
        "capacite maximale du pool %s atteinte"
        % queue_name,
    )


def reject_duplicate_request(
    jsonrpc_id,
):
    return err_result(
        jsonrpc_id,
        -32600,
        "id JSON-RPC deja actif : %s"
        % jsonrpc_id,
    )


def submit_control_request(
    executor,
    req,
):
    jsonrpc_id = req.get(
        "id"
    )

    if not CONTROL_CAPACITY.acquire(
        blocking=False
    ):
        write_response(
            reject_busy_request(
                jsonrpc_id,
                "CONTROL",
            )
        )

        return

    try:
        cancel_event = register_active_request(
            jsonrpc_id
        )

    except DuplicateRequestId:
        CONTROL_CAPACITY.release()

        write_response(
            reject_duplicate_request(
                jsonrpc_id
            )
        )

        return

    control_increment()

    try:
        executor.submit(
            process_control_request,
            req,
            cancel_event,
        )

    except Exception:
        control_decrement()

        unregister_active_request(
            jsonrpc_id,
            cancel_event,
        )

        CONTROL_CAPACITY.release()

        raise


def submit_fast_request(
    executor,
    req,
):
    jsonrpc_id = req.get(
        "id"
    )

    if not FAST_CAPACITY.acquire(
        blocking=False
    ):
        write_response(
            reject_busy_request(
                jsonrpc_id,
                "FAST",
            )
        )

        return

    try:
        cancel_event = register_active_request(
            jsonrpc_id
        )

    except DuplicateRequestId:
        FAST_CAPACITY.release()

        write_response(
            reject_duplicate_request(
                jsonrpc_id
            )
        )

        return

    fast_increment()

    try:
        executor.submit(
            process_fast_request,
            req,
            cancel_event,
        )

    except Exception:
        fast_decrement()

        unregister_active_request(
            jsonrpc_id,
            cancel_event,
        )

        FAST_CAPACITY.release()

        raise


def submit_blocking_request(
    executor,
    req,
):
    jsonrpc_id = req.get(
        "id"
    )

    if not BLOCKING_CAPACITY.acquire(
        blocking=False
    ):
        write_response(
            reject_busy_request(
                jsonrpc_id,
                "BLOCKING",
            )
        )

        return

    try:
        cancel_event = register_active_request(
            jsonrpc_id
        )

    except DuplicateRequestId:
        BLOCKING_CAPACITY.release()

        write_response(
            reject_duplicate_request(
                jsonrpc_id
            )
        )

        return

    blocking_increment()

    try:
        executor.submit(
            process_blocking_request,
            req,
            cancel_event,
        )

    except Exception:
        blocking_decrement()

        unregister_active_request(
            jsonrpc_id,
            cancel_event,
        )

        BLOCKING_CAPACITY.release()

        raise


def main():
    global PROCESS_STARTED_AT

    PROCESS_STARTED_AT = utc_now()

    try:
        acquire_instance_lock()
    except InstanceLockError as exc:
        print(
            "cgpt-approval-bridge: %s"
            % exc,
            file=sys.stderr,
            flush=True,
        )
        return 73

    try:
        journal_instance_started()
    except (
        journal.JournalError,
        journal.JournalValidationError,
    ) as exc:
        print(
            "cgpt-approval-bridge: journalisation demarrage impossible: %s"
            % exc,
            file=sys.stderr,
            flush=True,
        )
        release_instance_lock()
        return 74

    try:
        recover_after_unclean_shutdown()
    except (
        StoreError,
        ValidationError,
        journal.JournalError,
        journal.JournalValidationError,
    ) as exc:
        print(
            "cgpt-approval-bridge: recuperation post-crash impossible: %s"
            % exc,
            file=sys.stderr,
            flush=True,
        )
        release_instance_lock()
        return 75

    try:
        recover_orphaned_remediation_attempts()
    except (
        StoreError,
        ValidationError,
        journal.JournalError,
        journal.JournalValidationError,
    ) as exc:
        print(
            "cgpt-approval-bridge: recuperation remediation orpheline impossible: %s"
            % exc,
            file=sys.stderr,
            flush=True,
        )
        release_instance_lock()
        return 76

    try:
        load_auto_remediation_circuit_state()
    except (
        StoreError,
        journal.JournalError,
        journal.JournalValidationError,
    ) as exc:
        print(
            "cgpt-approval-bridge: restauration circuit breaker impossible: %s"
            % exc,
            file=sys.stderr,
            flush=True,
        )
        release_instance_lock()
        return 77

    control_executor = ThreadPoolExecutor(
        max_workers=MAX_CONTROL_WORKERS,
        thread_name_prefix="cgpt-mcp-control",
    )

    fast_executor = ThreadPoolExecutor(
        max_workers=MAX_FAST_WORKERS,
        thread_name_prefix="cgpt-mcp-fast",
    )

    blocking_executor = ThreadPoolExecutor(
        max_workers=MAX_BLOCKING_WORKERS,
        thread_name_prefix="cgpt-mcp-blocking",
    )

    start_background_reconciliation()
    start_pending_watchdog()
    start_session_watchdog()
    start_readiness_publisher()
    start_auto_remediation_scheduler()

    try:
        for line in sys.stdin:
            line = line.strip()

            if not line:
                continue

            note_session_activity("mcp")

            try:
                req = json.loads(
                    line
                )

            except json.JSONDecodeError:
                write_response(
                    err_result(
                        None,
                        -32700,
                        "Parse error: JSON invalide",
                    )
                )

                continue

            valid, response = (
                validate_jsonrpc_message(
                    req
                )
            )

            if not valid:
                if response is not None:
                    write_response(
                        response
                    )

                continue

            valid, response = (
                validate_mcp_request(
                    req
                )
            )

            if not valid:
                if response is not None:
                    write_response(
                        response
                    )

                continue

            if is_notification(
                req
            ):
                handle_notification(
                    req
                )

                continue

            if is_direct_control_request(
                req
            ):
                write_response(
                    handle_request(
                        req
                    )
                )

                continue

            tool_name = tool_name_from_request(
                req
            )

            if tool_name in CONTROL_TOOLS:
                submit_control_request(
                    control_executor,
                    req,
                )

                continue

            if tool_name in BLOCKING_TOOLS:
                submit_blocking_request(
                    blocking_executor,
                    req,
                )

                continue

            submit_fast_request(
                fast_executor,
                req,
            )

    finally:
        stop_auto_remediation_scheduler()
        stop_readiness_publisher()
        stop_session_watchdog()
        stop_pending_watchdog()
        try:
            journal_instance_stopping()
        except (
            journal.JournalError,
            journal.JournalValidationError,
        ) as exc:
            print(
                "cgpt-approval-bridge: journalisation arret en cours impossible: %s"
                % exc,
                file=sys.stderr,
                flush=True,
            )

        cancel_all_active_requests()

        control_executor.shutdown(
            wait=True,
            cancel_futures=False,
        )

        fast_executor.shutdown(
            wait=True,
            cancel_futures=False,
        )

        blocking_executor.shutdown(
            wait=True,
            cancel_futures=False,
        )

        try:
            journal_instance_stopped()
        except (
            journal.JournalError,
            journal.JournalValidationError,
        ) as exc:
            print(
                "cgpt-approval-bridge: journalisation arret final impossible: %s"
                % exc,
                file=sys.stderr,
                flush=True,
            )

        release_instance_lock()

    return 0


if __name__ == "__main__":
    sys.exit(main())
