<?php

namespace ThomasInstitut\EntitySystem\ValueType;

class VagueDate
{

    const INTRA_SEP = '.';
    const INTER_SEP = ';';

    private array $post;
    private array $ante;

    private bool $postCirca;
    private bool $anteCirca;

    public function __construct()
    {
        $this->post = [];
        $this->ante = [];
        $this->postCirca = false;
        $this->anteCirca = false;
    }

    public function getSortableString() : string {
        return $this->toCompactString();
    }


    public function toHumanString() : string {

        $postString = implode('-', $this->post);
        $anteString = implode('-', $this->ante);
        return implode(' ', [ $postString, $anteString]);
    }

    public function toCompactString() : string {
        $postString = implode(self::INTRA_SEP, $this->post);
        $anteString = implode(self::INTRA_SEP, $this->ante);
        return implode(self::INTER_SEP, [ $postString, $anteString]);
    }

    public function setFromCompactString(string $str) : VagueDate {
        [ $post, $ante ]= explode(self::INTER_SEP, $str);
        if ($post !== '') {
            $postArray = explode(self::INTRA_SEP, $post );
            $this->post = [ intval($postArray[0] ?? 0), intval($postArray[1] ?? 0), intval($postArray[2] ??0 )];
        }
        if ($ante !== '') {
            $anteArray = explode(self::INTRA_SEP, $ante );
            $this->ante = [ intval($anteArray[0] ?? 0), intval($anteArray[1] ?? 0), intval($anteArray[2] ??0 )];
        }
        return $this;
    }

    public static function fromCompactString(string $str) : VagueDate {
        return (new VagueDate())->setFromCompactString($str);
    }
}