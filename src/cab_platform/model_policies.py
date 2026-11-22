"""Politiques enregistrées pour la consultation du catalogue de modèles."""
from decimal import Decimal, InvalidOperation
import re
from unicodedata import category, normalize

from django.db import IntegrityError, transaction

from .core.commands import Refused, require
from .core.models import AgentModelPolicy

CONTEXT_STEPS = (0, 262_144, 500_000, 1_000_000, 1_048_576)
OUTPUT_STEPS = (0, 64_000, 500_000, 1_000_000, 1_048_576)
PRICE_FIELDS = ('input_price_min', 'input_price_max', 'output_price_min', 'output_price_max',
                'cache_read_min', 'cache_read_max', 'cache_write_min', 'cache_write_max')
MODEL_BOUNDS = {
    'context': ('context_min', None),
    'output': ('output_min', None),
    'input_cost': ('input_price_min', 'input_price_max'),
    'output_cost': ('output_price_min', 'output_price_max'),
    'cache_read_cost': ('cache_read_min', 'cache_read_max'),
    'cache_write_cost': ('cache_write_min', 'cache_write_max'),
}
POLICY_FIELDS = ('id', 'name', 'model_filter', 'include_free', 'include_paid', 'context_min', 'output_min',
                 'sort_column', 'sort_descending', *PRICE_FIELDS)
FREE_WORD = re.compile(r'(?<![^\W_])free(?![^\W_])', re.IGNORECASE)


def policy_or_error(policy_id):
    policy = AgentModelPolicy.objects.filter(pk=policy_id).first()
    require(policy is not None, 'agent-model-policy-not-found', 404)
    return policy


def policy_list():
    return list(AgentModelPolicy.objects.order_by('id').values(*POLICY_FIELDS))


def save_policy(policy_id, values):
    name = values['name'].strip()
    require(0 < len(name) <= 120 and name.casefold() != 'tous' and all(char.isprintable() for char in name),
            'agent-model-policy-name-invalid', 400)
    require(values['context_min'] in CONTEXT_STEPS and values['output_min'] in OUTPUT_STEPS,
            'agent-model-policy-slider-invalid', 400)
    model_filter = values.get('model_filter', '').strip()
    require(len(model_filter) <= 2048 and all(char.isprintable() or category(char) == 'Zs' for char in model_filter),
            'agent-model-policy-filter-invalid', 400)
    values = {**values, 'name': name, 'model_filter': model_filter}
    for min_field, max_field in MODEL_BOUNDS.values():
        if min_field and max_field:
            minimum, maximum = values[min_field], values[max_field]
            require(not maximum or minimum <= maximum, 'agent-model-policy-bounds-invalid', 400)
    try:
        with transaction.atomic():
            if policy_id is None:
                policy = AgentModelPolicy.objects.create(**values)
            else:
                policy = AgentModelPolicy.objects.select_for_update().filter(pk=policy_id).first()
                require(policy is not None, 'agent-model-policy-not-found', 404)
                for field, value in values.items():
                    setattr(policy, field, value)
                policy.save(update_fields=values.keys())
    except IntegrityError as error:
        if getattr(getattr(error.__cause__, 'diag', None), 'constraint_name', None) != 'agent_model_policy_name':
            raise
        raise Refused('agent-model-policy-duplicate', 409) from None
    return {field: getattr(policy, field) for field in POLICY_FIELDS}


def remove_policy(policy_id):
    count, _ = AgentModelPolicy.objects.filter(pk=policy_id).delete()
    require(count == 1, 'agent-model-policy-not-found', 404)
    return {'removed': True}


def comparable_cost(value):
    if isinstance(value, bool) or not isinstance(value, (int, float, str, Decimal)):
        return None
    try:
        cost = Decimal(str(value))
        return cost if cost.is_finite() and cost >= 0 else None
    except InvalidOperation:
        return None


def fold_name(value):
    return ''.join(char for char in normalize('NFD', value.casefold()) if not category(char).startswith('M'))


def excluded_names(model_filter):
    return tuple(term for raw in model_filter.split(';') if (term := fold_name(raw.strip())))


def matches(policy, model, exclusions):
    name = model.get('name') or ''
    identifier = model['identifier']
    if exclusions:
        displayed_name = fold_name(name or identifier)
        if any(term in displayed_name for term in exclusions):
            return False
    free = bool(FREE_WORD.search(name) or FREE_WORD.search(identifier)) or (
        comparable_cost(model.get('input_cost')) == 0 and comparable_cost(model.get('output_cost')) == 0
    )
    if not (policy.include_free if free else policy.include_paid):
        return False
    for field, (min_field, max_field) in MODEL_BOUNDS.items():
        minimum = getattr(policy, min_field) if min_field else 0
        maximum = getattr(policy, max_field) if max_field else 0
        if minimum or maximum:
            value = comparable_cost(model.get(field))
            if value is None or (minimum and value < minimum) or (maximum and value > maximum):
                return False
    return True


def sort_models(policy, rows):
    def key(model):
        price = comparable_cost(model.get(policy.sort_column))
        if price is None:
            return True, 0
        return False, -price if policy.sort_descending else price

    rows.sort(key=key)
