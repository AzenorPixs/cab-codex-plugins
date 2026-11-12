from django.db import models

class Configuration(models.Model):
    key=models.CharField(primary_key=True,max_length=100)
    value=models.JSONField(default=dict)
    updated=models.DateTimeField(auto_now=True)
    class Meta:
        db_table='configuration'

class Project(models.Model):
    id=models.CharField(primary_key=True,max_length=64)
    name=models.CharField(max_length=120,blank=True,default='')
    root=models.CharField(max_length=1500,unique=True)
    owner_uid=models.PositiveIntegerField()
    owner_gid=models.PositiveIntegerField(null=True,blank=True)
    creation_state=models.CharField(max_length=16,default='READY')
    creation_request_id=models.CharField(max_length=36,blank=True,null=True,unique=True)
    created=models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table='projects'

class Actor(models.Model):
    id=models.CharField(primary_key=True,max_length=128)
    uid=models.PositiveIntegerField()
    agent=models.CharField(max_length=40)
    role=models.CharField(max_length=24,default='coder')
    token_hash=models.CharField(max_length=64,unique=True)
    projects=models.ManyToManyField(Project)
    native=models.JSONField(default=dict)
    active=models.BooleanField(default=True)

class Run(models.Model):
    project=models.ForeignKey(Project,on_delete=models.PROTECT)
    run_id=models.CharField(max_length=128)
    session_id=models.CharField(max_length=200)
    actor=models.ForeignKey(Actor,on_delete=models.PROTECT)
    mode=models.CharField(max_length=12)
    change=models.CharField(max_length=200)
    state=models.CharField(max_length=32,default='WORKING')
    generation=models.PositiveBigIntegerField(default=1)
    mandate=models.JSONField(default=dict)
    review=models.JSONField(default=dict)
    source_revision=models.CharField(max_length=64,blank=True)
    suspension=models.CharField(max_length=16,blank=True)
    created=models.DateTimeField(auto_now_add=True)
    updated=models.DateTimeField(auto_now=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=['project','run_id'],name='cab_run_identity')]

class Operation(models.Model):
    run=models.ForeignKey(Run,on_delete=models.PROTECT)
    request_id=models.CharField(max_length=200)
    input_digest=models.CharField(max_length=64)
    state=models.CharField(max_length=32,default='INTENT')
    request=models.JSONField(default=dict)
    receipt=models.JSONField(default=dict)
    receipt_digest=models.CharField(max_length=64,blank=True)
    source_revision=models.CharField(max_length=64)
    dispatch_nonce=models.CharField(max_length=80)
    dispatched=models.BooleanField(default=False)
    created=models.DateTimeField(auto_now_add=True)
    updated=models.DateTimeField(auto_now=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=['run','request_id'],name='cab_operation_identity')]

class Resource(models.Model):
    key=models.CharField(primary_key=True,max_length=1800)
    revision=models.PositiveBigIntegerField(default=0)
    fencing=models.PositiveBigIntegerField(default=0)

class Lease(models.Model):
    resource=models.ForeignKey(Resource,on_delete=models.PROTECT)
    run=models.ForeignKey(Run,on_delete=models.PROTECT)
    operation=models.ForeignKey(Operation,null=True,on_delete=models.PROTECT)
    state=models.CharField(max_length=24,default='HELD')
    fencing=models.PositiveBigIntegerField()
    evidence=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)

class Notice(models.Model):
    project=models.ForeignKey(Project,on_delete=models.PROTECT)
    notice_id=models.CharField(max_length=200)
    producer=models.ForeignKey(Run,on_delete=models.PROTECT)
    subject=models.CharField(max_length=300)
    stage=models.CharField(max_length=24)
    proof=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=['project','notice_id'],name='cab_notice_identity')]

class Subscription(models.Model):
    run=models.ForeignKey(Run,on_delete=models.PROTECT)
    dependency_id=models.CharField(max_length=200)
    subject=models.CharField(max_length=300)
    criterion=models.TextField()
    acknowledgements=models.JSONField(default=list)
    class Meta:
        constraints=[models.UniqueConstraint(fields=['run','dependency_id'],name='cab_subscription_identity')]

class Event(models.Model):
    project=models.ForeignKey(Project,null=True,on_delete=models.PROTECT)
    run=models.ForeignKey(Run,null=True,on_delete=models.PROTECT)
    kind=models.CharField(max_length=80)
    data=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)

class SessionProjection(models.Model):
    binding=models.OneToOneField(Run,primary_key=True,on_delete=models.PROTECT)
    project_id=models.CharField(max_length=64,db_index=True)
    run_id=models.CharField(max_length=128)
    session_id=models.CharField(max_length=200)
    mode=models.CharField(max_length=12)
    state=models.CharField(max_length=32)
    change=models.CharField(max_length=200)
    generation=models.PositiveBigIntegerField()
    updated=models.DateTimeField(auto_now=True)

class Incident(models.Model):
    incident_id=models.CharField(primary_key=True,max_length=200)
    project=models.ForeignKey(Project,null=True,on_delete=models.PROTECT)
    run=models.ForeignKey(Run,null=True,on_delete=models.PROTECT)
    category=models.CharField(max_length=80)
    summary=models.TextField()
    evidence=models.JSONField(default=list)
    state=models.CharField(max_length=24,default='OPEN')
    claim=models.JSONField(default=dict)
    resolution=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)

class Metric(models.Model):
    run=models.ForeignKey(Run,on_delete=models.PROTECT)
    source=models.CharField(max_length=80)
    stream=models.CharField(max_length=200)
    sequence=models.PositiveBigIntegerField()
    values=models.JSONField(default=dict)
    coverage=models.JSONField(default=dict)
    model=models.JSONField(default=dict)
    updated=models.DateTimeField(auto_now=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=['run','source','stream'],name='cab_metric_stream')]

class LegacySnapshot(models.Model):
    source=models.CharField(max_length=1800)
    sha256=models.CharField(max_length=64)
    payload=models.JSONField()
    imported=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=['source','sha256'],name='cab_legacy_snapshot')]

class Workshop(models.Model):
    run=models.OneToOneField(Run,on_delete=models.PROTECT)
    path=models.CharField(max_length=1800)
    device=models.PositiveBigIntegerField()
    inode=models.PositiveBigIntegerField()
    uid=models.PositiveIntegerField()
    created=models.DateTimeField(auto_now_add=True)

class Maintenance(models.Model):
    transaction_id=models.CharField(primary_key=True,max_length=128)
    state=models.CharField(max_length=24)
    evidence=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)
