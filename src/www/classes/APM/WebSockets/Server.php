<?php

namespace APM\WebSockets;

use Monolog\Handler\StreamHandler;
use Monolog\Level;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Monolog\Logger;
use Psr\Log\LoggerInterface;
use Socket;
use ThomasInstitut\EntitySystem\Tid;

/**
 * A websockets server
 *
 * Adapted from php-websocket (https://github.com/orangeable/php-websocket/blob/master/websocket.php)
 */
class Server implements LoggerAwareInterface
{
    use LoggerAwareTrait;

    private string $host;
    private int $port;
    private array $clients;

    public function __construct(string $host, int $port, ?LoggerInterface $logger = null)
    {
        $this->host = $host;
        $this->port = $port;
        $this->clients = [];

        if ($logger === null) {
            $logger = new Logger('WS');
            $logger->pushHandler(new StreamHandler('php://stdout', Level::Debug));
        }
        $this->setLogger($logger);

    }

    public function run(): void {
        $this->logger->info("Starting WS");
        // create a streaming socket, of type TCP/IP
        $socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
        if ($socket === false) {
            $this->logger->critical("socket_create() failed: " . socket_strerror(socket_last_error()));
            return;
        }
        $this->logger->info("Socket created");
        // set the option to reuse the port
        if (!socket_set_option($socket, SOL_SOCKET, SO_REUSEADDR, 1)){
            $this->logger->critical("socket_set_option() failed: " . socket_strerror(socket_last_error()));
        }
        // bind the socket to the server's host and port
        if (!socket_bind($socket, $this->host, $this->port)){
            $this->logger->critical("socket_bind() failed: " . socket_strerror(socket_last_error($socket)));
        }
        // start listen for connections
        if (!socket_listen($socket)){
            $this->logger->critical("socket_listen() failed: " . socket_strerror(socket_last_error($socket)));
        }
        $this->logger->info("Accepting connections on {$this->host}:{$this->port}");
        $keepRunning = true;
        pcntl_async_signals(true);
        pcntl_signal(SIGTERM, function() use (&$keepRunning) {
            $this->logger->info("SIGTERM received, will exit as soon as possible");
            $keepRunning = false;
        });
        pcntl_signal(SIGINT, function() use (&$keepRunning) {
            $this->logger->info("Keyboard interrupt signal (SIGINT) received, will exit as soon as possible");
            $keepRunning = false;
        });

        $lastMessage = time();

        while($keepRunning) {
            // create a copy, so $clients doesn't get modified by socket_select()
            $readClientSockets = [ $socket, ...$this->getClientSockets()];
            $write = null; // may be used later
            $except = null; // may be used later
            // get a list of all the clients that have data to be read from
            // if there are no clients with data, go to next iteration
            $selectResult = @socket_select($readClientSockets, $write, $except, 0);

            if ( $selectResult === false) {
                $error = socket_last_error();
                if ($error == SOCKET_EINTR) {
                    // interrupted
                    $keepRunning = false;
                    continue;
                }
                continue;
            }
            // first, see if there's any new client trying to connect
            if (in_array($socket, $readClientSockets)) {
                $newClientSocket = socket_accept($socket);
                $header = socket_read($newClientSocket, 4096);
                $this->logger->debug("Received header from potential new client", [ 'header' => $header ]);
                $this->perform_handshaking($header, $newClientSocket);
                socket_getpeername($newClientSocket, $ip);
                $newClient = [
                    'id' => $this->getNewClientName(),
                    'socket' => $newClientSocket,
                    'ipAddress' => $ip,
                ];
                $this->clients[] = $newClient;
                $this->logger->info("New client " . $newClient['id'] . ", ip = $ip");
                $this->sendDataToClient($newClient,[ 'type' => 'id', 'id' => $newClient['id'] ] );
                $this->broadcast([ 'type' => 'newClient', 'id' => $newClient['id']], [$newClientSocket]);
                // remove the main socket from the readClients list before the iteration that follows
                unset($readClientSockets[array_search($socket, $readClientSockets)]);
            }
            foreach ($readClientSockets as $clientSocket) {
                // check for incoming data:
                $client = $this->getClientBySocket($clientSocket);
                if ($client === null) {
                    $this->logger->error("Data from un-registered client");
                    continue;
                }
                while(socket_recv($clientSocket, $buf, 1024, 0) >= 1) {
                    if (str_starts_with($buf, "{")) {
                        $received_text = $buf;
                    } else {
                        $received_text = $this->unmask($buf);
                    }

                    $data = json_decode($received_text, true);
                    $cmd = strtolower($data['command'] ?? 'nc');
                    switch( strtolower($cmd)){
                        case 'exit':
                            $this->logger->info("Client {$client['id']} disconnected");
                            socket_close($clientSocket);
                            $this->removeClientBySocket($clientSocket);
                            $this->broadcast([ 'type' => 'disconnect', 'id' => $client['id']], [ $clientSocket]);
                            break;

                        case 'msg':
                            $msg = $data['msg'] ?? '';
                            if ($msg !== '') {
                                $this->logger->debug("Received text from client socket: {$received_text}");
                                $this->broadcast([ 'type' => 'msg', 'source' => $client['id'], 'msg' => $msg], [$clientSocket]);
                            }

                            break;

                        default:
                            $this->logger->warning("Unknown command {$cmd}, received text from client socket: {$received_text}");
                    }
                    break 2;
                }

                // read from socket to see if the client has disconnected
                $data = @socket_read($clientSocket, 1024, PHP_NORMAL_READ);
                // check if the client is disconnected
                if ($data === false) {
                    $this->removeClientBySocket($clientSocket);
                    // continue to the next client to read from, if any
                    continue;
                }

            }

            // see if it's time for a message
            $now = time();
            if ($now > ($lastMessage+4) && count($this->clients) > 0) {
                $msg = "Keeping in touch at $now";
                $this->logger->info("Sending keep alive message: '$msg'");
                $this->broadcast([ 'type' => 'keepAlive', 'msg' => $msg]);
                $lastMessage = $now;
            }
        }
        socket_close($socket);
    }

    /**
     * Send data (an associative array, or a string) to the given client
     * in JSON format
     * @param $client
     * @param array|string $data
     * @return void
     */
    private function sendDataToClient($client, array|string $data) : void {
        $json = json_encode($data);
        $maskedData = $this->mask($json);
        socket_write($client['socket'], $maskedData, strlen($maskedData));
    }

    private function broadcast(array|string $data, array $socketsToIgnore = []): void {
        foreach ($this->clients as $clientToWrite) {
            if (in_array($clientToWrite['socket'], $socketsToIgnore)) {
                // do not write to sockets in the ignore list
                continue;
            }
            $this->sendDataToClient($clientToWrite, $data);
        }
    }

    private function getClientSockets(): array {
        return array_map(function ($client) {
            return $client['socket'];
        }, $this->clients);
    }

    private function getClientBySocket(Socket $socket): ?array {
        foreach ($this->clients as $client) {
            if ($client['socket'] === $socket) {
                return $client;
            }
        }
        return null;
    }

    private function removeClientBySocket(Socket $clientSocket): void {
        $index = -1;
        foreach ($this->clients as $i => $client) {
            if ($client['socket'] === $clientSocket) {
                $index = $i;
                break;
            }
        }
        if ($index >= 0) {
            array_splice($this->clients, $index, 1);
        }
    }

    private function getNewClientName() : int {
        return Tid::generateUnique();
    }


    // unmask incoming framed message:
    private function unmask(string $message) : string {
        $length = ord($message[1]) & 127;

        if ($length == 126) {
            $masks = substr($message, 4, 4);
            $data  = substr($message, 8);
        }
        elseif ($length == 127) {
            $masks = substr($message, 10, 4);
            $data  = substr($message, 14);
        }
        else {
            $masks = substr($message, 2, 4);
            $data  = substr($message, 6);
        }

        $message = "";

        for ($i = 0; $i < strlen($data); $i++) {
            $message .= $data[$i] ^ $masks[$i % 4];
        }

        return $message;
    }


    // encode message for transfer to client:
    private function mask(string $message) : string{
        $b1 = 0x80 | (0x1 & 0x0f);
        $length = strlen($message);

        if ($length <= 125) {
            $header = pack("CC", $b1, $length);
        } elseif ($length > 125 && $length < 65536) {
            $header = pack("CCn", $b1, 126, $length);
        } elseif ($length >= 65536) {
            $header = pack ("CCNN", $b1, 127, $length);
        }

        return $header.$message;
    }

    private function perform_handshaking(string $received_header, Socket $client_conn) {
        $headers  = array();
        $protocol = (stripos($this->host, "local.") !== false) ? "ws" : "wss";
        $lines    = preg_split("/\r\n/", $received_header);

        foreach ($lines as $line) {
            $line = chop($line);

            if (preg_match("/\A(\S+): (.*)\z/", $line, $matches)) {
                $headers[$matches[1]] = $matches[2];
            }
        }

        $secKey = $headers["Sec-WebSocket-Key"];
        $secAccept = base64_encode(pack("H*", sha1($secKey . "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")));

        $upgrade =
            "HTTP/1.1 101 Web Socket Protocol Handshake\r\n" .
            "Upgrade: WebSocket\r\n" .
            "Connection: Upgrade\r\n" .
            "WebSocket-Origin: $this->host\r\n" .
            "WebSocket-Location: $protocol://$this->host:$this->port/websocket.php\r\n" .
            "Sec-WebSocket-Version: 13\r\n" .
            "Sec-WebSocket-Accept:$secAccept\r\n\r\n";

        socket_write($client_conn, $upgrade, strlen($upgrade));
    }
}