<?php

namespace ThomasInstitut\Http;


abstract class HttpStatus
{
    const int SUCCESS = 200;
    const int MOVED_PERMANENTLY = 301;
    const int BAD_REQUEST = 400;
    const int UNAUTHORIZED = 401;
    const int FORBIDDEN = 403;
    const int NOT_FOUND = 404;
    const int METHOD_NOT_ALLOWED = 405;
    const int CONFLICT = 409;
    const int INTERNAL_SERVER_ERROR = 500;
    const int NOT_IMPLEMENTED = 501;
    const int SERVICE_UNAVAILABLE = 503;
}
