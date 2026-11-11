from asgiref.sync import iscoroutinefunction,markcoroutinefunction
class PeerMiddleware:
    def __init__(self,get_response):
        self.get_response=get_response
        if iscoroutinefunction(get_response):markcoroutinefunction(self)
    def __call__(self,request):
        request.cab_peer=request.scope.get('cab.peer') if hasattr(request,'scope') else None
        return self.get_response(request)
