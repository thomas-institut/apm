<?php

namespace ThomasInstitut\Ape\Config;

use ThomasInstitut\Settable\FromFlatArrayTrait;
use ThomasInstitut\Settable\SettableFromArray;

class VersionConfig implements SettableFromArray
{

   use FromFlatArrayTrait;

   public string $title;
   public string $date;
}