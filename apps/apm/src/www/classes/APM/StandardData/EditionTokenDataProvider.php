<?php


namespace APM\StandardData;


use APM\Core\Token\EditionToken;

class EditionTokenDataProvider implements StandardDataProvider
{


    private EditionToken $token;

    public function __construct(EditionToken $token)
    {
        $this->token = $token;
    }

    public function getStandardData()
    {
        $data = (new TokenDataProvider($this->token))->getStandardData();
        $data->tokenClass = StandardTokenClass::EDITION;
        return $data;
    }
}