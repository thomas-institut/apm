<?php

namespace ThomasInstitut\Exportable;

interface Exportable
{
   public function getExportObject() : array;
}