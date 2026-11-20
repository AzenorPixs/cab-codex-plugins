import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {api} from './api'
import {newRequestId} from './requestId'
import {type Project} from './Projects'

const types=[['debian','Debian'],['docker','Docker']] as const
type Kind=typeof types[number][0]
type Artifact={key:string;kind:Kind;generated_at:string;size:number;filename?:string;package?:string;architecture?:string;version?:string;image?:string;image_id?:string;platform?:string;tags?:string[]}
type Build={state:string;error?:string|null}
type Factory={enabled:Record<Kind,boolean>;artifacts:Artifact[];builds:Partial<Record<Kind,Build>>}

const buildStatus:Record<string,string>={
  PENDING:'Construction en attente',
  RUNNING:'Construction en cours',
  COMPLETED:'Construction terminée',
  FAILED:'Construction échouée',
  UNKNOWN:'Résultat à vérifier',
}
const buildErrors:Record<string,string>={
  'artifact-debian-version-conflict':'Un paquet différent existe déjà pour cette version.',
  'artifact-docker-version-conflict':'Une image différente existe déjà pour cette version.',
  'artifact-recipe-invalid':'La recette de construction est invalide.',
  'artifact-source-invalid':'Un fichier déclaré dans la recette est invalide.',
  'artifact-source-private':'La recette pointe vers un fichier privé ou temporaire.',
  'artifact-build-config-changed':'La configuration du projet a changé depuis la demande.',
  'artifact-docker-args-invalid':'Les arguments du build Docker sont invalides.',
}
const activeBuild=(build?:Build)=>build?.state==='PENDING'||build?.state==='RUNNING'
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

export function ProjectFactory({project}:{project:Project}){
  const client=useQueryClient()
  const path=`projects/${encodeURIComponent(project.id)}/artifacts`
  const key=['project-artifacts',project.id]
  const inventory=useQuery({
    queryKey:key,
    queryFn:()=>api<Factory>(path),
    refetchInterval:query=>Object.values(query.state.data?.builds||{}).some(activeBuild)?1500:15000,
  })
  const build=useMutation({
    mutationFn:(kind:Kind)=>api(`${path}/${kind}/build`,{request_id:newRequestId()}),
    onSettled:()=>client.invalidateQueries({queryKey:key}),
  })
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
        const running=activeBuild(job)||(build.isPending&&build.variables===kind)
        return <article className="agent-card forge-card" key={kind}>
          <div className="forge-heading">
            <div className="forge-heading-main"><h2>Artefact {label}</h2></div>
            <div className="forge-actions">
              <button type="button" className={`forge-edit git-commit${running?' is-loading':''}`}
                title={`Générer l’artefact ${label}`} aria-label={`Générer l’artefact ${label}`}
                disabled={busy} aria-busy={running} onClick={()=>build.mutate(kind)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="m3 8 9-5 9 5v8l-9 5-9-5zm0 0 9 5 9-5m-9 5v8M7.5 5.5l9 5"/>
                </svg>
              </button>
            </div>
          </div>
          <div className="forge-card-content">
            {job&&<p role="status">{buildStatus[job.state]}{job.error&&buildErrors[job.error]&&` · ${buildErrors[job.error]}`}</p>}
            {build.error&&build.variables===kind&&<p role="alert">{build.error.message}</p>}
            {rows.length?rows.map(artifact=><ArtifactInformation key={artifact.key} artifact={artifact}/>):<p>Aucun artefact observé.</p>}
          </div>
        </article>
      })}
    </div>
  </section>
}
