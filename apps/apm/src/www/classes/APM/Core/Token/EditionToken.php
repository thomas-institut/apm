<?php


namespace APM\Core\Token;

/**
 * Class EditionToken
 *
 * A token in an edition witness
 *
 * For the time being there's nothing making this different than a simple token, but eventually
 * there will be formatting fields as well.
 * @package APM\Core\Token
 */

class EditionToken extends Token
{

    static public function newFromToken(Token $token) : EditionToken {
        return new EditionToken($token->getType(), $token->getText(), $token->getNormalization(), $token->getNormalizationSource());
    }

}