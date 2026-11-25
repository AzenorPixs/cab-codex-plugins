import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {useEffect,useRef,useState} from 'react'
import {ApiError,api} from './api'
import {newRequestId} from './requestId'
import {type Project} from './Projects'

const types=[['debian','Debian'],['docker','Docker']] as const
type Kind=typeof types[number][0]
type Artifact={key:string;kind:Kind;generated_at:string;size:number;filename?:string;package?:string;architecture?:string;version?:string;image?:string;image_id?:string;platform?:string;tags?:string[]}
type ConfigurationIssue={key:string;line?:number;reason:string}
type BlockingOperation={id:string;source:'factory'|'publication'|'delivery';state:string;created:string;kind?:Kind;forge?:string;version?:string}
export type Build={
  state:string;request_id?:string;version?:string;created?:string;error?:string|null
  source?:'factory'|'delivery';delivery_id?:number
  phase?:string;steps?:string[];process_started?:boolean;exit_code?:number
  configuration?:{state:string;issues:ConfigurationIssue[]}
  diagnostic?:{phase?:string;code:string;exit_code?:number;paths?:string[];typescript_codes?:string[]}
  blocking_operation?:BlockingOperation
}
type Factory={enabled:Record<Kind,boolean>;artifacts:Artifact[];builds:Partial<Record<Kind,Build>>}

const buildStatus:Record<string,string>={
  PENDING:'Construction en attente',
  RUNNING:'Construction en cours',
  COMPLETED:'Construction terminée',
  FAILED:'Construction échouée',
  REFUSED:'Demande refusée',
  UNKNOWN:'Résultat à vérifier',
}
const buildErrors:Record<string,string>={
  'artifact-debian-version-conflict':'Un paquet différent existe déjà pour cette version.',
  'artifact-docker-version-conflict':'Une image différente existe déjà pour cette version.',
  'artifact-docker-version-required':'Renseignez la version du projet pour créer les deux tags Docker.',
  'artifact-recipe-invalid':'La recette de construction est invalide.',
  'artifact-source-invalid':'Un fichier déclaré dans la recette est invalide.',
  'artifact-source-private':'La recette pointe vers un fichier privé ou temporaire.',
  'artifact-build-config-changed':'La configuration nécessaire à la construction est invalide, indisponible ou a changé.',
  'artifact-docker-args-invalid':'Les arguments du build Docker sont invalides.',
  'artifact-docker-name-invalid':'Le nom local de l’image Docker est invalide.',
  'artifact-docker-daemon-unavailable':'Le service Docker est inaccessible.',
  'artifact-docker-pull-denied':'Docker n’a pas pu télécharger une image requise.',
  'artifact-build-storage-full':'L’espace de stockage est insuffisant.',
  'artifact-build-command-failed':'La commande de construction a échoué.',
  'artifact-build-active':'Une autre opération sur les artefacts est active ou reste à vérifier.',
  'artifact-build-worker-not-started':'Le worker de construction n’a pas pu démarrer.',
  'session-delivery-active':'Une livraison du projet est active ou reste à vérifier.',
  'artifact-build-disabled':'Ce format est désactivé dans le projet.',
  'artifact-build-unconfirmed':'Le résultat de la construction reste à vérifier.',
}
const blockerSources={factory:'Construction',publication:'Publication',delivery:'Livraison CI/CD'}
const blockerStates:Record<string,string>={PENDING:'En attente',RUNNING:'En cours',UNKNOWN:'Résultat à vérifier',PARTIAL:'Livraison partielle'}
const buildPhases:Record<string,string>={
  request:'Demande',configuration:'Configuration',sources:'Préparation des sources',
  'payload-preparation':'Préparation du contenu Debian','debian-build':'Construction Debian',
  'docker-build':'Construction Docker','docker-tag':'Pose du tag latest',inventory:'Inventaire',
}
const configurationStates:Record<string,string>={
  ready:'Lisible',partial:'Champs refusés',missing:'Fichier absent',unsafe:'Fichier non admissible',unavailable:'Lecture indisponible',
}
const issueReasons:Record<string,string>={
  duplicate:'Affectation en double','invalid-syntax':'Syntaxe invalide','invalid-value':'Valeur invalide',
  'invalid-version':'Version invalide',changed:'Version modifiée depuis la demande',disabled:'Construction désactivée depuis la demande',
}
const activeBuild=(build?:Build)=>build?.state==='PENDING'||build?.state==='RUNNING'
const failedBuild=(build?:Build)=>build?.state==='FAILED'||build?.state==='UNKNOWN'
const sizeText=(size:number)=>size>=1024**3?`${(size/1024**3).toLocaleString('fr-FR',{maximumFractionDigits:2})} Gio`:
  size>=1024**2?`${(size/1024**2).toLocaleString('fr-FR',{maximumFractionDigits:2})} Mio`:
  size>=1024?`${(size/1024).toLocaleString('fr-FR',{maximumFractionDigits:2})} Kio`:
  `${size.toLocaleString('fr-FR')} octets`

function ArtifactInformation({artifact}:{artifact:Artifact}){
  const rows=artifact.kind==='debian'?
    [['Paquet',artifact.package],['Version',artifact.version],['Architecture',artifact.architecture],['Fichier',artifact.filename]]:
    [['Image',artifact.image],['Tags',artifact.tags?.join(', ')],['Identifiant',artifact.image_id],['Plateforme',artifact.platform]]
  return <dl>
    {rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd title={value} style={{overflowWrap:'anywhere'}}>{value||'—'}</dd></div>)}
    <div><dt>Taille</dt><dd>{sizeText(artifact.size)}</dd></div>
    <div><dt>Date</dt><dd><time dateTime={artifact.generated_at}>{new Date(artifact.generated_at).toLocaleString('fr-FR')}</time></dd></div>
  </dl>
}

export function BuildOverview({label,build,close}:{label:string;build:Build;close:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{if(dialog.current&&!dialog.current.open)dialog.current.showModal()},[])
  const code=build.error||build.diagnostic?.code
  const blocker=build.blocking_operation
  const exitCode=build.exit_code??build.diagnostic?.exit_code
  return <dialog ref={dialog} aria-label={`Overview de construction ${label}`}
    className="lifecycle-dialog git-commit-console-dialog" onClose={close}>
    <h2>Construction {label}</h2>
    <dl>
      <div><dt>État</dt><dd>{buildStatus[build.state]||build.state}</dd></div>
      <div><dt>Origine</dt><dd>{build.source==='delivery'?'Livraison CI/CD':'Fabrique'}</dd></div>
      {build.request_id&&<div><dt>Demande</dt><dd>{build.request_id}</dd></div>}
      {build.delivery_id!==undefined&&<div><dt>Livraison</dt><dd>{build.delivery_id}</dd></div>}
      {build.version&&<div><dt>Version</dt><dd>{build.version}</dd></div>}
      {build.created&&<div><dt>Date</dt><dd><time dateTime={build.created}>{new Date(build.created).toLocaleString('fr-FR')}</time></dd></div>}
      {build.phase&&<div><dt>Dernière étape</dt><dd>{buildPhases[build.phase]||build.phase}</dd></div>}
      {build.process_started!==undefined&&<div><dt>Processus démarré</dt><dd>{build.process_started?'Oui':'Non'}</dd></div>}
      {exitCode!==undefined&&<div><dt>Code de sortie</dt><dd>{exitCode}</dd></div>}
    </dl>
    {code&&<p role="alert">{buildErrors[code]||'La construction n’a pas abouti.'} <code>{code}</code></p>}
    {blocker&&<><h3>Opération bloquante</h3><dl>
      <div><dt>Origine</dt><dd>{blockerSources[blocker.source]}{blocker.forge&&` · ${blocker.forge}`}{blocker.kind&&` · ${blocker.kind==='docker'?'Docker':'Debian'}`}</dd></div>
      <div><dt>État</dt><dd>{blockerStates[blocker.state]||blocker.state}</dd></div>
      <div><dt>Reçu</dt><dd><code>{blocker.id}</code></dd></div>
      <div><dt>Date</dt><dd><time dateTime={blocker.created}>{new Date(blocker.created).toLocaleString('fr-FR')}</time></dd></div>
      {blocker.version&&<div><dt>Version</dt><dd>{blocker.version}</dd></div>}
    </dl></>}
    {Boolean(build.steps?.length)&&<><h3>Étapes observées</h3><ol>{build.steps?.map((phase,index)=>
      <li key={`${phase}-${index}`}>{buildPhases[phase]||phase}</li>)}</ol></>}
    {build.configuration&&<><h3>Configuration du projet</h3><p>{configurationStates[build.configuration.state]}</p>
      {build.configuration.issues.length>0&&<ul>{build.configuration.issues.map(issue=>
        <li key={`${issue.key}-${issue.line}`}><code>{issue.key}</code>{issue.line&&` · ligne ${issue.line}`} · {issueReasons[issue.reason]}</li>)}</ul>}</>}
    {Boolean(build.diagnostic?.paths?.length)&&<ul>{build.diagnostic?.paths?.map(path=><li key={path}><code>{path}</code></li>)}</ul>}
    {Boolean(build.diagnostic?.typescript_codes?.length)&&<p>Diagnostics TypeScript {build.diagnostic?.typescript_codes?.join(', ')}</p>}
    <div className="form-actions"><button type="button" onClick={close}>Fermer</button></div>
  </dialog>
}

export function ProjectFactory({project}:{project:Project}){
  const client=useQueryClient()
  const [overview,setOverview]=useState<{kind:Kind;build:Build}|null>(null)
  const [rejected,setRejected]=useState<Partial<Record<Kind,Build>>>({})
  const [submitted,setSubmitted]=useState<{kind:Kind;requestId:string}|null>(null)
  const path=`projects/${encodeURIComponent(project.id)}/artifacts`
  const key=['project-artifacts',project.id]
  const inventory=useQuery({
    queryKey:key,
    queryFn:()=>api<Factory>(path),
    refetchInterval:query=>Object.values(query.state.data?.builds||{}).some(activeBuild)?1500:15000,
  })
  const build=useMutation({
    mutationFn:({kind,requestId}:{kind:Kind;requestId:string})=>api(`${path}/${kind}/build`,{request_id:requestId}),
    onSuccess:(_response,{kind,requestId})=>{
      setRejected(previous=>({...previous,[kind]:undefined}))
      setSubmitted({kind,requestId})
    },
    onError:(error,{kind,requestId})=>{
      const details=error instanceof ApiError?error.details as Partial<Build>|undefined:undefined
      const refusal:Build={
        phase:'request',steps:['request'],...details,request_id:requestId,created:new Date().toISOString(),
        state:details?.blocking_operation?'REFUSED':error instanceof ApiError?'FAILED':'UNKNOWN',
        error:error instanceof ApiError?error.code:'artifact-build-unconfirmed',
      }
      setRejected(previous=>({...previous,[kind]:refusal}))
      setOverview({kind,build:refusal})
    },
    onSettled:()=>client.invalidateQueries({queryKey:key}),
  })
  const observed=submitted?inventory.data?.builds[submitted.kind]:undefined
  useEffect(()=>{
    if(!submitted||observed?.request_id!==submitted.requestId||activeBuild(observed))return
    if(failedBuild(observed))setOverview({kind:submitted.kind,build:observed})
    setSubmitted(null)
  },[observed,submitted])
  if(inventory.isPending)return <p role="status">Chargement des artefacts…</p>
  if(!inventory.data)return <p role="alert">Impossible de lire les artefacts du projet.</p>
  const {enabled,artifacts,builds}=inventory.data
  const available=types.filter(([kind])=>enabled[kind])
  if(!available.length)return <p>Aucun type d’artefact activé pour ce projet.</p>
  const busy=build.isPending||Object.values(builds).some(job=>activeBuild(job)||job?.state==='UNKNOWN')
  return <section className="project-forges-content" aria-label="Artefacts du projet">
    <div className="agents-grid project-forges">
      {available.map(([kind,label])=>{
        const rows=artifacts.filter(item=>item.kind===kind)
        const job=builds[kind]
        const running=activeBuild(job)||(build.isPending&&build.variables?.kind===kind)
        const refusal=rejected[kind]
        const detail=refusal&&(!job?.created||Date.parse(refusal.created??'')>=Date.parse(job.created))?refusal:job
        return <article className="agent-card forge-card" key={kind}>
          <div className="forge-heading">
            <div className="forge-heading-main"><h2>Artefact {label}</h2></div>
            <div className="forge-actions">
              <button type="button" className={`forge-edit git-commit${running?' is-loading':''}`}
                title={`Générer l’artefact ${label}`} aria-label={`Générer l’artefact ${label}`}
                disabled={busy} aria-busy={running} onClick={()=>build.mutate({kind,requestId:newRequestId()})}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="m3 8 9-5 9 5v8l-9 5-9-5zm0 0 9 5 9-5m-9 5v8M7.5 5.5l9 5"/>
                </svg>
              </button>
            </div>
          </div>
          <div className="forge-card-content">
            {job&&<p role="status">{buildStatus[job.state]}{job.error&&buildErrors[job.error]&&` · ${buildErrors[job.error]}`}</p>}
            {detail&&<button type="button" className="forge-link" onClick={()=>setOverview({kind,build:detail})}>
              Détail de la construction {label}
            </button>}
            {rows.length?rows.map(artifact=><ArtifactInformation key={artifact.key} artifact={artifact}/>):<p>Aucun artefact observé.</p>}
          </div>
        </article>
      })}
    </div>
    {overview&&<BuildOverview label={overview.kind==='docker'?'Docker':'Debian'} build={overview.build} close={()=>setOverview(null)}/>}
  </section>
}
