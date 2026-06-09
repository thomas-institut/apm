<?php

namespace APM\System;

interface EditionSourceManager
{

    public function getSourceByTid(int $tid) : array;

    public function getAllSources() : array;

}