<?php

namespace ThomasInstitut\EntitySystem;

/**
 * This interface describes the entity manager system to be used across all
 * Thomas-Institut applications: APM, Dare, Bilderberg.
 *
 */
interface EntityManager
{

    public function generateUniqueEntityId():string;

}