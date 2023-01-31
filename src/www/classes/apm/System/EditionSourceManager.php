<?php

namespace APM\System;

abstract class EditionSourceManager
{

    abstract function getSourceInfoByUuid($uuid) : array;

    abstract function getAllSources() : array;

}