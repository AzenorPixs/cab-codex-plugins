import uuid
from itertools import islice

from django.db import migrations


def drop_progress(apps, schema_editor):
    alias=schema_editor.connection.alias
    deliveries=apps.get_model('cab_core','GitDelivery').objects.using(alias)
    notifications=apps.get_model('cab_core','Notification').objects.using(alias)
    receipts=apps.get_model('cab_core','NotificationReceipt').objects.using(alias)
    ids=deliveries.values_list('pk',flat=True).iterator()
    while batch:=list(islice(ids,250)):
        keys=[uuid.uuid5(uuid.NAMESPACE_URL,f'cab-notification:delivery:{pk}:progress') for pk in batch]
        notifications.filter(pk__in=keys).delete()
        receipts.filter(pk__in=keys).delete()


class Migration(migrations.Migration):
    dependencies=[('cab_core','0041_binary_counts')]
    operations=[migrations.RunPython(drop_progress,migrations.RunPython.noop)]
