<?php

namespace ThomasInstitut\AuthService;

interface PasswordCheckerInterface
{
    const UNACCEPTABLE_PASSWORD = 'unacceptable';
    const WEAK_PASSWORD = 'weak';
    const STRONG_PASSWORD = 'strong';


    /**
     * Returns a descriptive string about the strength of the given string as a
     * password in the system: 'unacceptable', 'weak', 'strong'
     * @param string $password
     * @return string
     */
    public function measurePasswordStrength(string $password) : string;


}