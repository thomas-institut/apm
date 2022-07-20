from ServerProcessor import ServerProcessor


class EchoProcessor(ServerProcessor):

    def __init__(self):
        self.counter = 0

    def process_request(self, request):
        self.counter = self.counter+1
        resp = super().process_request(request)

        resp.set_result({ "count": self.counter, "data": request.get_data()})
        return resp

