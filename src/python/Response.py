class Response:
    def __init__(self):
        self.status = ''
        self.data = None
        self.result = None

    def set_status(self, new_status):
        self.status = new_status
        return self

    def get_status(self):
        return self.status

    def get_data(self):
        return self.data

    def set_data(self, data):
        self.data = data
        return self

    def set_result(self, result):
        self.result = result

    def get_result(self):
        return self.result
