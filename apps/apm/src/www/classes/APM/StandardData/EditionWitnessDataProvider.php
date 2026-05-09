<?php


namespace APM\StandardData;


use APM\Core\Witness\EditionWitness;
use APM\System\WitnessType;

class EditionWitnessDataProvider implements StandardDataProvider
{

    private EditionWitness $witness;

    public function __construct(EditionWitness $witness)
    {
        $this->witness = $witness;
    }

    /**
     * @inheritDoc
     */
    public function getStandardData()
    {
        $data = (new WitnessDataProvider($this->witness))->getStandardData();
        $data->witnessType = WitnessType::CHUNK_EDITION;
        unset($data->localWitnessId);

        $data->tokens = [];
        foreach($this->witness->getTokens() as $token) {
            $data->tokens[] = (new EditionTokenDataProvider($token))->getStandardData();
        }
        return $data;
    }
}