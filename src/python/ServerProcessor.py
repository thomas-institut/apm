from Response import Response


class ServerProcessor:

    def process_request(self, request):
        resp = Response()
        resp.set_result('')
        resp.set_status('OK')
        return resp



