#!/usr/bin/env python3
import json
import socket

from EchoProcessor import EchoProcessor
from Request import Request
from TextMeasurerProcessor import TextMeasurerProcessor

host = '127.0.0.1'
port = 12345
buffer_size = 4096

s = socket.socket()
print("Socket successfully created")
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind((host, port))

print("Socket bound to %s" % port)

# put the socket into listening mode
s.listen(5)
print("Socket is listening")


# Processors
echo_processor = EchoProcessor()
measurer = TextMeasurerProcessor()

# a forever loop until we interrupt it or
# an error occurs
while True:
    print('Ready for new connection')
    try:
        conn, address = s.accept()
    except KeyboardInterrupt:
        print("Keyboard interrupt, shutting down")
        raw_input = b''
        s.close()
        conn = None
        address = None
        exit()

    print('Got connection from', address)

    while True:
        try:
            raw_input = conn.recv(buffer_size)
        except KeyboardInterrupt:
            print("Keyboard interrupt, shutting down")
            raw_input = b''
            conn.close()
            s.close()
            exit()
        except ConnectionResetError:
            print("Connection reset by peer")
            conn.close()
            break

        print("Received data from peer")
        print(raw_input)

        try:
            input_string = raw_input.decode('UTF-8')
        except UnicodeDecodeError:
            print('Could not decode data, disconnecting')
            input_string = ''
            raw_input = b''
            conn.close()
            break
        input_string = input_string.strip('\n').strip('\r')
        if input_string == 'END' or input_string == 'end':
            print('END connection')
            conn.close()
            break

        try:
            input_obj = json.loads(input_string)
        except json.JSONDecodeError:
            input_obj = None
            print("Invalid JSON as input, closing connection")
            print(input_string)
            conn.close()
            break

        if not type(input_obj) is dict:
            print("Input is not an object, ignoring")
            continue

        if input_obj.get('command') is None:
            print("No command in input, just ignoring")
            continue

        command = input_obj.get('command')
        data = input_obj.get('data')
        request = Request()
        request.set_data(data)

        if command == 'echo':
            response = echo_processor.process_request(request)
            conn.send(json.dumps(response.get_result()).encode('UTF-8'))
        elif command == 'measure':
            response = measurer.process_request(request)
            print("Response to 'measure' command")
            print(response.get_result())
            conn.send(json.dumps({'status': response.get_status(), 'result': response.get_result()}).encode('UTF-8'))
        elif command == 'end':
            print('END connection')
            conn.close()
            break
        else:
            print('Unknown command %s ' % command)
