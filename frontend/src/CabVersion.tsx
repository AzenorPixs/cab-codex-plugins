import {createContext,useContext,useEffect,type ReactNode} from 'react'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {Shape,ShapeStream} from '@electric-sql/client'
import {api} from './api'

type Version={version:string|null;git_version:string|null}
const VersionContext=createContext<string|null>(null)
const GitVersionContext=createContext<string|null>(null)
export function useGitVersion(){return useContext(GitVersionContext)}
export function useCabVersion(){return useContext(VersionContext)}
export function CabVersionProvider({children}:{children:ReactNode}){
  const client=useQueryClient()
  const query=useQuery({queryKey:['cab-version'],queryFn:()=>api<Version>('cab-version')})
  useEffect(()=>{
    const controller=new AbortController()
    const stream=new ShapeStream({url:new URL('/api/v1/sync/cab-version',location.origin).href,signal:controller.signal,onError:()=>({})})
    const shape=new Shape(stream)
    const unsubscribe=shape.subscribe(({rows})=>{const row=rows.find(value=>Number(value.id)===1);if(row&&typeof row.version==='string')client.setQueryData<Version>(['cab-version'],{version:row.version,git_version:typeof row.git_version==='string'?row.git_version:null})})
    return ()=>{unsubscribe();controller.abort()}
  },[client])
  return <VersionContext.Provider value={query.data?.version||null}><GitVersionContext.Provider value={query.data?.git_version||null}>{children}</GitVersionContext.Provider></VersionContext.Provider>
}
