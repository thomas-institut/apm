<?php

namespace APM\System\ContainerDefinitions;

interface ApmContainerDefsProvider
{

    /**
     * Returns an array of container definitions suitable to run a complete APM system.
     *
     * The idea is to have different classes implementing this interface to provide container definitions
     * for specific uses: web app, CLI, testing, etc.
     *
     * @param array<string, mixed> $config
     * @return array<string, mixed>
     */
    public function getContainerDefs(array $config): array;
}