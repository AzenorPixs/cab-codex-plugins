import django.db.models.deletion
from django.db import migrations,models

class Migration(migrations.Migration):
    dependencies=[('cab_core','0022_agent_mcp_status')]
    operations=[migrations.CreateModel(name='AgentUser',fields=[
        ('id',models.BigAutoField(primary_key=True,serialize=False)),
        ('uid',models.PositiveBigIntegerField()),
        ('username',models.CharField(max_length=128)),
        ('home',models.CharField(max_length=1500)),
        ('agent',models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name='users',to='cab_core.agent')),
    ],options={'db_table':'agent_users','constraints':[models.UniqueConstraint(fields=['agent','uid'],name='agent_user_uid_unique'),models.UniqueConstraint(fields=['agent','username'],name='agent_user_name_unique')]})]
