import {useEffect,useState} from 'react'
import {useQueryClient} from '@tanstack/react-query'
import {Shape,ShapeStream} from '@electric-sql/client'

export function useRunElectric(projectId:string,runId:string){
  const client=useQueryClient();const [live,setLive]=useState(false)
  useEffect(()=>{
    const controller=new AbortController()
    setLive(false)
    const stream=new ShapeStream({url:new URL('/api/v1/sync/run-data/run',location.origin).href,params:{project_id:projectId,run_id:runId},signal:controller.signal,onError:()=>{setLive(false);return {}}})
    const unsubscribe=new Shape(stream).subscribe(()=>{
      if(controller.signal.aborted)return
      setLive(true)
      void client.invalidateQueries({queryKey:['run',projectId,runId]})
      void client.invalidateQueries({queryKey:['finalization',projectId,runId]})
      void client.invalidateQueries({queryKey:['stage-metrics',projectId,runId]})
    })
    return ()=>{controller.abort();unsubscribe()}
  },[projectId,runId,client])
  return live
}
