<?php

namespace APM\EntitySystem\Kernel;

class EntityDefinition
{
    /**
     * The entity's tid
     * @var int
     */
    public int $tid = -1;

    /**
     * The entity's type
     * @var int
     */
    public int $type = -1;

    /**
     * The entity's name, which MUST not be empty
     * for valid entities.
     * @var string
     */
    public string $name = '';
    /**
     * The entity's description in English
     * @var string
     */
    public string $description = '';

    /**
     * The entity's name in other languages.
     *
     * Keys in the array are language codes and values are the translations:
     *
     *    ``[  'es' => 'Nombre en español', 'fr' => 'Nom en français' ... ]``
     *
     * @var array
     */
    public array $translatedNames = [];

    /**
     * The entity's description in other languages.
     *
     * Keys in the array are language codes and values are the translations:
     *
     *    ``[  'es' => 'En español', 'fr' => 'En français' ... ]``
     *
     * @var array
     */
    public array $translatedDescriptions = [];
}