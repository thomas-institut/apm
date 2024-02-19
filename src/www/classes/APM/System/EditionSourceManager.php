<?php

namespace APM\System;

abstract class EditionSourceManager
{

    abstract function getSourceByTid(int $tid) : array;

    abstract function getAllSources() : array;

}