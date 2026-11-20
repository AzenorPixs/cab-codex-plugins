from django.db import models

class Agent(models.Model):
    id=models.CharField(primary_key=True,max_length=40)
    label=models.CharField(max_length=100)
    position=models.PositiveSmallIntegerField()
    installed=models.BooleanField(null=True,default=None)
    running=models.BooleanField(null=True,default=None)
    local_version=models.CharField(max_length=100,null=True,blank=True,default=None)
    mcp_connected=models.BooleanField(null=True,default=None)
    mcp_versions=models.JSONField(default=list)
    class Meta:db_table='agents'

class AgentUser(models.Model):
    agent=models.ForeignKey(Agent,on_delete=models.PROTECT,related_name='users')
    uid=models.PositiveBigIntegerField()
    username=models.CharField(max_length=128)
    home=models.CharField(max_length=1500)
    config_present=models.BooleanField(null=True,default=None)
    config_path=models.CharField(max_length=1500,blank=True,default='')
    mcp_declared=models.BooleanField(null=True,default=None)
    config_error=models.CharField(max_length=100,blank=True,default='')
    reconcile_state=models.CharField(max_length=24,default='IDLE')
    class Meta:
        db_table='agent_users'
        constraints=[models.UniqueConstraint(fields=['agent','uid'],name='agent_user_uid_unique'),models.UniqueConstraint(fields=['agent','username'],name='agent_user_name_unique')]

class Configuration(models.Model):
    key=models.CharField(primary_key=True,max_length=100)
    value=models.JSONField(default=dict)
    updated=models.DateTimeField(auto_now=True)
    class Meta:
        db_table='configuration'

class CabVersionProjection(models.Model):
    id=models.PositiveSmallIntegerField(primary_key=True,default=1)
    version=models.CharField(max_length=100)
    git_version=models.CharField(max_length=100,blank=True,default='')
    class Meta:db_table='cab_version_projection'

class InterfacePreferencesProjection(models.Model):
    id=models.PositiveSmallIntegerField(primary_key=True,default=1)
    preferences=models.JSONField(default=dict)
    class Meta:db_table='interface_preferences_projection'

class Project(models.Model):
    identifier=models.CharField(max_length=100,unique=True,null=True,blank=True)
    id=models.CharField(primary_key=True,max_length=64)
    name=models.CharField(max_length=120,blank=True,default='')
    root=models.CharField(max_length=1500,unique=True)
    owner_uid=models.PositiveIntegerField()
    owner_gid=models.PositiveIntegerField(null=True,blank=True)
    configuration=models.JSONField(default=dict)
    public_metadata=models.JSONField(default=dict)
    creation_state=models.CharField(max_length=16,default='READY')
    creation_request_id=models.CharField(max_length=36,blank=True,null=True,unique=True)
    created=models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table='projects'

class ProjectArtifact(models.Model):
    project=models.ForeignKey(Project,on_delete=models.CASCADE)
    kind=models.CharField(max_length=12)
    artifact_key=models.CharField(max_length=200)
    generated_at=models.DateTimeField()
    metadata=models.JSONField(default=dict)

    class Meta:
        db_table='project_artifacts'
        constraints=[models.UniqueConstraint(fields=['project','kind','artifact_key'],name='project_latest_artifact')]


class ProjectForgeArtifact(models.Model):
    project=models.ForeignKey(Project,on_delete=models.CASCADE)
    forge=models.CharField(max_length=12)
    source=models.JSONField(default=list)
    artifacts=models.JSONField(default=dict)

    class Meta:
        db_table='project_forge_artifacts'
        constraints=[models.UniqueConstraint(fields=['project','forge'],name='project_forge_artifact_snapshot')]


class ProjectForgeArtifactPublication(models.Model):
    id=models.CharField(primary_key=True,max_length=200)
    project=models.ForeignKey(Project,on_delete=models.CASCADE)
    forge=models.CharField(max_length=12)
    state=models.CharField(max_length=16,default='PENDING')
    plan=models.JSONField(default=dict)
    executor=models.JSONField(default=dict)
    receipt=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table='project_forge_artifact_publications'
        constraints=[models.UniqueConstraint(fields=['project'],condition=models.Q(state__in=['PENDING','RUNNING','UNKNOWN']),name='project_forge_one_active_publication')]


class ProjectArtifactBuild(models.Model):
    id=models.CharField(primary_key=True,max_length=200)
    project=models.ForeignKey(Project,on_delete=models.CASCADE)
    kind=models.CharField(max_length=12)
    version=models.CharField(max_length=100)
    state=models.CharField(max_length=16,default='PENDING')
    executor=models.JSONField(default=dict)
    receipt=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table='project_artifact_builds'
        constraints=[models.UniqueConstraint(fields=['project'],condition=models.Q(state__in=['PENDING','RUNNING','UNKNOWN']),name='project_artifact_one_active_build')]


class GitProject(models.Model):
    project=models.OneToOneField(Project,on_delete=models.CASCADE,primary_key=True)
    state=models.JSONField(default=dict)
    checked_at=models.DateTimeField(null=True)
    class Meta:db_table='git_projects'

class ForgeVersion(models.Model):
    id=models.CharField(max_length=64,primary_key=True)
    forge=models.CharField(max_length=16)
    base_url=models.CharField(max_length=500)
    version=models.CharField(max_length=100,blank=True,default='')
    last_check=models.DateTimeField(null=True)
    next_check=models.DateTimeField(null=True)
    class Meta:db_table='forge_versions'

class ProjectMetadataProjection(models.Model):
    id=models.CharField(primary_key=True,max_length=64)
    public_metadata=models.JSONField(default=dict)
    class Meta:db_table='project_metadata_projection'

class Actor(models.Model):
    id=models.CharField(primary_key=True,max_length=128)
    uid=models.PositiveIntegerField()
    agent=models.CharField(max_length=40)
    role=models.CharField(max_length=24,default='coder')
    token_hash=models.CharField(max_length=64,unique=True)
    projects=models.ManyToManyField(Project)
    native=models.JSONField(default=dict)
    active=models.BooleanField(default=True)

class SystemUpdate(models.Model):
    request_id=models.CharField(primary_key=True,max_length=200)
    actor=models.ForeignKey(Actor,on_delete=models.PROTECT)
    target_version=models.CharField(max_length=100,blank=True)
    state=models.CharField(max_length=24,default='QUEUED')
    active_slot=models.PositiveSmallIntegerField(unique=True,null=True,default=1)
    result=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)
    updated=models.DateTimeField(auto_now=True)
    class Meta:db_table='system_updates'

class UpdateAvailability(models.Model):
    id=models.PositiveSmallIntegerField(primary_key=True,default=1)
    latest_version=models.CharField(max_length=100,blank=True)
    checked_at=models.DateTimeField(null=True)
    next_check_at=models.DateTimeField(null=True)
    checking_until=models.DateTimeField(null=True)
    requested=models.BooleanField(default=True)
    forced=models.BooleanField(default=False)
    error=models.CharField(max_length=100,blank=True)
    class Meta:db_table='update_availability'

class McpConnector(models.Model):
    id=models.CharField(primary_key=True,max_length=64)
    actor=models.ForeignKey(Actor,on_delete=models.PROTECT)
    agent=models.CharField(max_length=24)
    process=models.JSONField()
    worker=models.JSONField(default=dict)
    recovery_anchor=models.JSONField(default=dict)
    loaded_version=models.CharField(max_length=100,blank=True)
    catalog_version=models.CharField(max_length=100,blank=True)
    relay_version=models.CharField(max_length=100,blank=True)
    generation=models.PositiveBigIntegerField(default=0)
    pending=models.PositiveIntegerField(default=0)
    uncertain=models.BooleanField(default=False)
    state=models.CharField(max_length=40,default='STARTING')
    error=models.CharField(max_length=100,blank=True)
    seen=models.DateTimeField(auto_now=True)
    class Meta:db_table='mcp_connectors'

class McpConnectorProjection(models.Model):
    connector=models.OneToOneField(McpConnector,on_delete=models.PROTECT,primary_key=True,related_name='public_projection')
    agent=models.CharField(max_length=24)
    uid=models.PositiveIntegerField()
    loaded_version=models.CharField(max_length=100,blank=True)
    catalog_version=models.CharField(max_length=100,blank=True)
    relay_version=models.CharField(max_length=100,blank=True)
    state=models.CharField(max_length=40)
    connected=models.BooleanField(default=False)
    class Meta:db_table='mcp_connector_projection'


class McpDisconnectRecovery(models.Model):
    connector=models.ForeignKey(McpConnector,on_delete=models.PROTECT)
    project=models.ForeignKey(Project,null=True,on_delete=models.SET_NULL)
    anchor=models.JSONField(default=dict)
    baseline=models.JSONField(default=list)
    purpose=models.CharField(max_length=16,default='loss')
    state=models.CharField(max_length=24,default='QUEUED')
    native_request=models.CharField(max_length=200,blank=True)
    report=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)
    finished=models.DateTimeField(null=True)

    class Meta:
        db_table='mcp_disconnect_recoveries'
        constraints=[models.UniqueConstraint(fields=['connector'],condition=models.Q(finished__isnull=True),name='mcp_disconnect_one_active')]


class McpConvergence(models.Model):
    scope=models.CharField(primary_key=True,max_length=100)
    incident=models.JSONField(default=dict)

    class Meta:db_table='mcp_convergence'


class ObservedBinary(models.Model):
    id=models.CharField(primary_key=True,max_length=64)
    pid=models.PositiveIntegerField()
    uid=models.PositiveIntegerField()
    username=models.CharField(max_length=256)
    executable=models.TextField()
    role=models.CharField(max_length=40)
    process=models.JSONField()
    active=models.BooleanField(default=True)
    first_seen=models.DateTimeField(auto_now_add=True)
    last_seen=models.DateTimeField(auto_now=True)
    stopped=models.DateTimeField(null=True)

    class Meta:db_table='cab_observed_binaries'


class BinaryCounts(models.Model):
    id=models.PositiveSmallIntegerField(primary_key=True,default=1)
    inactive=models.PositiveIntegerField(default=0)
    active=models.PositiveIntegerField(default=0)

    class Meta:db_table='cab_binary_counts'


class McpStopAttempt(models.Model):
    id=models.CharField(primary_key=True,max_length=64)
    connector=models.ForeignKey(McpConnector,on_delete=models.PROTECT)
    digest=models.CharField(max_length=64)
    report=models.JSONField()
    created=models.DateTimeField(auto_now_add=True)
    class Meta:db_table='mcp_stop_attempts'

class NativeReload(models.Model):
    id=models.CharField(primary_key=True,max_length=200)
    actor=models.ForeignKey(Actor,on_delete=models.PROTECT)
    target_version=models.CharField(max_length=100)
    owner=models.JSONField(default=dict)
    input_digest=models.CharField(max_length=64)
    state=models.CharField(max_length=24,default='QUEUED')
    dispatcher=models.JSONField(default=dict)
    result=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)
    updated=models.DateTimeField(auto_now=True)
    class Meta:db_table='native_mcp_reloads'

class ConnectorReload(models.Model):
    update=models.OneToOneField(SystemUpdate,on_delete=models.PROTECT,primary_key=True,related_name='connector_reload')
    targets=models.JSONField(default=list)
    version=models.CharField(max_length=100,blank=True)
    state=models.CharField(max_length=24,default='RECONNECTING')
    observations=models.JSONField(default=list)
    updated=models.DateTimeField(auto_now=True)
    class Meta:db_table='connector_reloads'

class CodingSession(models.Model):
    id=models.CharField(primary_key=True,max_length=64)
    project=models.ForeignKey(Project,on_delete=models.PROTECT,related_name='coding_sessions')
    native_id=models.CharField(max_length=200)
    agent=models.CharField(max_length=40)
    uid=models.PositiveIntegerField()
    configuration=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)
    updated=models.DateTimeField(auto_now=True)
    class Meta:
        db_table='sessions'
        constraints=[models.UniqueConstraint(fields=['project','agent','uid','native_id'],name='cab_session_identity')]

class Change(models.Model):
    id=models.CharField(primary_key=True,max_length=64)
    project=models.ForeignKey(Project,on_delete=models.PROTECT,related_name='changes')
    identifier=models.CharField(max_length=200)
    configuration=models.JSONField(default=dict)
    source_path=models.CharField(max_length=1500,blank=True)
    source_state=models.CharField(max_length=24,default='unobserved')
    tasks_done=models.PositiveIntegerField(null=True)
    tasks_total=models.PositiveIntegerField(null=True)
    tasks_sha256=models.CharField(max_length=64,blank=True)
    observed_at=models.DateTimeField(null=True)
    class Meta:
        db_table='changes'
        constraints=[models.UniqueConstraint(fields=['project','identifier'],name='cab_change_identity')]

class GitChange(models.Model):
    change=models.OneToOneField(Change,on_delete=models.PROTECT,primary_key=True,related_name='git_snapshot')
    project=models.ForeignKey(Project,on_delete=models.PROTECT)
    initial_run=models.ForeignKey('Run',null=True,on_delete=models.SET_NULL)
    origin=models.JSONField(default=dict,db_default={})
    baseline=models.JSONField(default=dict)
    captured_at=models.DateTimeField()
    class Meta:db_table='git_changes'


class GitSessionIndex(models.Model):
    change=models.ForeignKey(Change,on_delete=models.PROTECT,related_name='git_indexes')
    session=models.ForeignKey(CodingSession,null=True,on_delete=models.SET_NULL,related_name='git_indexes')
    initial_run=models.ForeignKey('Run',null=True,on_delete=models.SET_NULL)
    origin=models.JSONField(default=dict,db_default={})
    base_head=models.CharField(max_length=64,blank=True)
    index_path=models.CharField(max_length=1500)
    keep_ref=models.CharField(max_length=200,blank=True,default='',db_default='')
    keep_oid=models.CharField(max_length=64,blank=True,default='',db_default='')
    state=models.CharField(max_length=24,default='OPEN')
    created=models.DateTimeField(auto_now_add=True)
    updated=models.DateTimeField(auto_now=True)
    class Meta:
        db_table='git_session_indexes'
        constraints=[models.UniqueConstraint(fields=['change','session'],name='git_session_change_unique')]

class GitFileReservation(models.Model):
    project=models.ForeignKey(Project,on_delete=models.PROTECT)
    git_index=models.ForeignKey(GitSessionIndex,on_delete=models.PROTECT,related_name='reservations')
    path=models.CharField(max_length=1500)
    path_digest=models.CharField(max_length=64)
    active=models.BooleanField(default=True)
    created=models.DateTimeField(auto_now_add=True)
    released=models.DateTimeField(null=True)
    class Meta:
        db_table='git_file_reservations'
        constraints=[models.UniqueConstraint(fields=['project','path_digest'],condition=models.Q(active=True),name='git_file_active_unique')]


class GitSessionEffect(models.Model):
    run=models.ForeignKey('Run',null=True,on_delete=models.SET_NULL,related_name='git_effects')
    git_index=models.ForeignKey(GitSessionIndex,on_delete=models.PROTECT,related_name='effects')
    origin=models.JSONField(default=dict,db_default={})
    request_id=models.CharField(max_length=200)
    request_digest=models.CharField(max_length=64)
    state=models.CharField(max_length=24,default='INTENT')
    receipt=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)
    updated=models.DateTimeField(auto_now=True)
    class Meta:
        db_table='git_session_effects'
        constraints=[models.UniqueConstraint(fields=['run','request_id'],name='git_session_effect_unique')]


class McpRunBinding(models.Model):
    connector=models.OneToOneField(McpConnector,on_delete=models.CASCADE,primary_key=True,related_name='run_binding')
    run=models.ForeignKey('Run',on_delete=models.CASCADE)
    bound_at=models.DateTimeField(auto_now=True)
    class Meta:db_table='mcp_run_bindings'

class McpThreadBinding(models.Model):
    connector=models.ForeignKey(McpConnector,on_delete=models.CASCADE)
    thread=models.CharField(max_length=200)
    run=models.ForeignKey('Run',on_delete=models.CASCADE)

    class Meta:
        db_table='mcp_thread_bindings'
        constraints=[models.UniqueConstraint(fields=['connector','thread'],name='mcp_connector_thread_unique')]


class GitDelivery(models.Model):
    project=models.ForeignKey(Project,on_delete=models.PROTECT,related_name='git_deliveries')
    run=models.ForeignKey('Run',null=True,on_delete=models.SET_NULL,related_name='git_deliveries')
    git_index=models.ForeignKey(GitSessionIndex,on_delete=models.PROTECT)
    origin=models.JSONField(default=dict,db_default={})
    version=models.CharField(max_length=64)
    state=models.CharField(max_length=24,default='PENDING')
    executor=models.JSONField(default=dict)
    plan=models.JSONField(default=dict)
    commit_oid=models.CharField(max_length=64,blank=True)
    tag_oid=models.CharField(max_length=64,blank=True)
    created=models.DateTimeField(auto_now_add=True)
    updated=models.DateTimeField(auto_now=True)
    class Meta:
        db_table='git_deliveries'
        constraints=[models.UniqueConstraint(fields=['run','version'],name='git_delivery_run_version_unique'),models.UniqueConstraint(fields=['project'],condition=models.Q(state__in=['PENDING','RUNNING','UNKNOWN','PARTIAL']),name='git_delivery_active_project_unique')]

class GitDeliveryStep(models.Model):
    delivery=models.ForeignKey(GitDelivery,on_delete=models.PROTECT,related_name='steps')
    key=models.CharField(max_length=100)
    state=models.CharField(max_length=24,default='PENDING')
    receipt=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)
    updated=models.DateTimeField(auto_now=True)
    class Meta:
        db_table='git_delivery_steps'
        constraints=[models.UniqueConstraint(fields=['delivery','key'],name='git_delivery_step_unique')]


class ChangeTask(models.Model):
    change=models.ForeignKey(Change,on_delete=models.PROTECT,related_name='task_records')
    source_id=models.CharField(max_length=128)
    label=models.TextField()
    completed=models.BooleanField(default=False)
    position=models.PositiveIntegerField()
    source_line=models.PositiveIntegerField()
    active=models.BooleanField(default=True)
    source_sha256=models.CharField(max_length=64)
    observed_at=models.DateTimeField()
    created=models.DateTimeField(auto_now_add=True)
    updated=models.DateTimeField(auto_now=True)
    class Meta:
        db_table='change_tasks'
        ordering=['position','pk']
        constraints=[models.UniqueConstraint(fields=['change','source_id'],name='cab_change_task_identity')]

class Run(models.Model):
    project=models.ForeignKey(Project,on_delete=models.PROTECT)
    run_id=models.CharField(max_length=128)
    session_id=models.CharField(max_length=200)
    actor=models.ForeignKey(Actor,on_delete=models.PROTECT)
    mode=models.CharField(max_length=12)
    change=models.CharField(max_length=200)
    coding_session=models.ForeignKey(CodingSession,null=True,on_delete=models.PROTECT,related_name='runs')
    change_record=models.ForeignKey(Change,null=True,on_delete=models.PROTECT,related_name='runs')
    configuration=models.JSONField(default=dict)
    stage=models.PositiveSmallIntegerField(null=True,blank=True)
    phase=models.CharField(max_length=32,blank=True)
    state=models.CharField(max_length=32,default='WORKING')
    generation=models.PositiveBigIntegerField(default=1)
    mandate=models.JSONField(default=dict)
    review=models.JSONField(default=dict)
    source_revision=models.CharField(max_length=64,blank=True)
    suspension=models.CharField(max_length=16,blank=True)
    created=models.DateTimeField(auto_now_add=True)
    updated=models.DateTimeField(auto_now=True)
    class Meta:
        db_table='runs'
        constraints=[models.UniqueConstraint(fields=['project','run_id'],name='cab_run_identity'),models.CheckConstraint(condition=models.Q(stage__isnull=True)|models.Q(stage__gte=1,stage__lte=11),name='cab_run_stage_valid')]

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
    suspension=models.CharField(max_length=32,blank=True)
    archived=models.BooleanField(default=False)
    change=models.CharField(max_length=200)
    generation=models.PositiveBigIntegerField()
    stage=models.PositiveSmallIntegerField(null=True)
    phase=models.CharField(max_length=32,blank=True)
    tasks_done=models.PositiveIntegerField(null=True)
    tasks_total=models.PositiveIntegerField(null=True)
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
    class Meta:
        db_table='ccab'

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

class MeasurementPeriod(models.Model):
    session=models.ForeignKey(CodingSession,on_delete=models.PROTECT,related_name='measurement_periods')
    run=models.ForeignKey(Run,on_delete=models.PROTECT,related_name='measurement_periods')
    change=models.ForeignKey(Change,on_delete=models.PROTECT,related_name='measurement_periods')
    started=models.DateTimeField()
    ended=models.DateTimeField(null=True)
    start_snapshot=models.JSONField(default=dict)
    end_snapshot=models.JSONField(default=dict)
    values=models.JSONField(default=dict)
    coverage=models.JSONField(default=dict)
    stop_reason=models.CharField(max_length=40,blank=True)
    class Meta:
        db_table='measurement_periods'
        constraints=[models.UniqueConstraint(fields=['session'],condition=models.Q(ended__isnull=True),name='cab_one_measurement_per_sid')]

class MeasurementAction(models.Model):
    run=models.ForeignKey(Run,on_delete=models.PROTECT)
    request_id=models.CharField(max_length=200)
    digest=models.CharField(max_length=64)
    result=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table='measurement_actions'
        constraints=[models.UniqueConstraint(fields=['run','request_id'],name='cab_measurement_receipt')]

class ChangeSource(models.Model):
    change=models.ForeignKey(Change,on_delete=models.PROTECT,related_name='local_sources')
    path=models.CharField(max_length=1500)
    archived=models.BooleanField(default=False)
    present=models.BooleanField(default=True)
    manifest=models.JSONField(default=dict)
    observed_at=models.DateTimeField(auto_now=True)
    class Meta:
        db_table='change_sources'
        constraints=[models.UniqueConstraint(fields=['change','path'],name='cab_change_source_path')]

class StatisticsDocument(models.Model):
    source=models.OneToOneField(ChangeSource,on_delete=models.PROTECT,related_name='statistics')
    content=models.TextField(default='')
    sha256=models.CharField(max_length=64,blank=True)
    status=models.CharField(max_length=32,default='missing')
    structure=models.JSONField(default=dict)
    source_mtime=models.PositiveBigIntegerField(default=0)
    imported_at=models.DateTimeField(auto_now=True)
    generated_digest=models.CharField(max_length=64,blank=True)
    generated_block_sha=models.CharField(max_length=64,blank=True)
    manual_override=models.BooleanField(default=False)
    class Meta:db_table='change_statistics'

class StatisticsRevision(models.Model):
    document=models.ForeignKey(StatisticsDocument,on_delete=models.PROTECT,related_name='revisions')
    sha256=models.CharField(max_length=64)
    content=models.TextField()
    structure=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table='change_statistics_revisions'
        constraints=[models.UniqueConstraint(fields=['document','sha256'],name='cab_statistics_revision')]

class StatisticsMetric(models.Model):
    document=models.ForeignKey(StatisticsDocument,on_delete=models.PROTECT,related_name='metrics')
    key=models.CharField(max_length=80)
    state=models.CharField(max_length=24)
    value=models.CharField(max_length=200,null=True)
    unit=models.CharField(max_length=40)
    reason=models.TextField(null=True)
    evidence=models.JSONField(default=list)
    class Meta:
        db_table='change_statistics_metrics'
        constraints=[models.UniqueConstraint(fields=['document','key'],name='cab_statistics_metric')]

class ProjectStatistics(models.Model):
    project=models.OneToOneField(Project,on_delete=models.PROTECT,related_name='statistics')
    content=models.TextField(default='')
    sha256=models.CharField(max_length=64,blank=True)
    manifest=models.JSONField(default=list)
    inventory_complete=models.BooleanField(default=False)
    coverage_complete=models.BooleanField(default=False)
    next_full_sync=models.DateTimeField(null=True)
    last_full_sync=models.DateTimeField(null=True)
    updated=models.DateTimeField(auto_now=True)
    error=models.CharField(max_length=200,blank=True)
    class Meta:db_table='project_statistics'

class StatisticsJob(models.Model):
    id=models.CharField(primary_key=True,max_length=64)
    project=models.ForeignKey(Project,on_delete=models.PROTECT)
    action=models.CharField(max_length=32)
    request_id=models.CharField(max_length=200)
    state=models.CharField(max_length=32,default='RUNNING')
    owner_pid=models.PositiveIntegerField()
    owner_start=models.CharField(max_length=80)
    expected=models.JSONField(default=dict)
    result=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)
    updated=models.DateTimeField(auto_now=True)
    class Meta:
        db_table='statistics_jobs'
        constraints=[models.UniqueConstraint(fields=['project','request_id'],name='cab_statistics_job_request')]

class StatisticsLock(models.Model):
    project=models.OneToOneField(Project,on_delete=models.PROTECT,primary_key=True)
    owner=models.ForeignKey(StatisticsJob,null=True,on_delete=models.PROTECT)
    fencing=models.PositiveBigIntegerField(default=0)
    class Meta:db_table='statistics_locks'

class LegacySnapshot(models.Model):
    source=models.CharField(max_length=1800)
    sha256=models.CharField(max_length=64)
    payload=models.JSONField()
    imported=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=['source','sha256'],name='cab_legacy_snapshot')]

class FinalizationPlan(models.Model):
    run=models.OneToOneField(Run,on_delete=models.PROTECT,related_name='finalization_plan')
    policy=models.JSONField(default=dict)
    digest=models.CharField(max_length=64,blank=True)
    phase=models.CharField(max_length=24,default='WAITING')
    missing=models.JSONField(default=list)
    receipt=models.JSONField(default=dict)
    check_revisions=models.JSONField(default=dict)
    updated=models.DateTimeField(auto_now=True)
    class Meta:db_table='run_finalization_plans'

class EvidenceProducer(models.Model):
    id=models.CharField(primary_key=True,max_length=200)
    project=models.ForeignKey(Project,on_delete=models.PROTECT)
    actor=models.ForeignKey(Actor,on_delete=models.PROTECT)
    kinds=models.JSONField()
    active=models.BooleanField(default=True)
    class Meta:db_table='evidence_producers'

class RunEvidence(models.Model):
    run=models.ForeignKey(Run,on_delete=models.PROTECT,related_name='finalization_evidence')
    source=models.CharField(max_length=220)
    evidence_id=models.CharField(max_length=200)
    payload=models.JSONField()
    digest=models.CharField(max_length=64)
    created=models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table='run_evidence'
        constraints=[models.UniqueConstraint(fields=['run','source','evidence_id'],name='cab_run_evidence_identity')]

class SessionArchive(models.Model):
    run=models.OneToOneField(Run,on_delete=models.PROTECT,related_name='session_archive')
    request_id=models.CharField(max_length=200)
    actor=models.ForeignKey(Actor,on_delete=models.PROTECT)
    evidence=models.JSONField()
    created=models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table='session_archives'

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


class TerminalGitCommit(models.Model):
    run=models.OneToOneField(Run,null=True,on_delete=models.SET_NULL,related_name='terminal_git')
    project=models.ForeignKey(Project,on_delete=models.PROTECT)
    origin=models.JSONField(default=dict)
    branch=models.CharField(max_length=16)
    state=models.CharField(max_length=24,default='INTENT')
    executor=models.JSONField(default=dict)
    index_path=models.CharField(max_length=1500,blank=True)
    base_head=models.CharField(max_length=64,blank=True)
    commit_oid=models.CharField(max_length=64,blank=True)
    snapshot=models.JSONField(default=dict)
    remote_plan=models.JSONField(default=list)
    receipt=models.JSONField(default=dict)
    created=models.DateTimeField(auto_now_add=True)
    updated=models.DateTimeField(auto_now=True)
    class Meta:db_table='terminal_git_commits'


class Notification(models.Model):
    id=models.UUIDField(primary_key=True,editable=False)
    project=models.ForeignKey(Project,null=True,on_delete=models.SET_NULL)
    sender=models.CharField(max_length=300)
    title=models.CharField(max_length=300)
    body=models.TextField()
    kind=models.CharField(max_length=16,default='message')
    choices=models.JSONField(default=list)
    fingerprint=models.CharField(max_length=64)
    read_at=models.DateTimeField(null=True)
    created=models.DateTimeField(auto_now_add=True)
    updated=models.DateTimeField(auto_now=True)
    class Meta:db_table='cab_notifications'


class NotificationReceipt(models.Model):
    id=models.UUIDField(primary_key=True,editable=False)
    state=models.CharField(max_length=16)
    fingerprint=models.CharField(max_length=64)
    choice=models.CharField(max_length=100,blank=True)
    actor=models.ForeignKey(Actor,null=True,on_delete=models.SET_NULL)
    created=models.DateTimeField(auto_now_add=True)
    class Meta:db_table='cab_notification_receipts'
