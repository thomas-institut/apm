<?php

namespace ThomasInstitut\AuthService;

interface PasswordGeneratorInterface
{

    /**
     * Generates a random string that can be used as a password
     * @return string
     */
    public function generateRandomPassword() : string;

}