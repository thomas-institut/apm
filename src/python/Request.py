class Request:
    def __init__(self):
        self.status = ''
        self.data = None

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
