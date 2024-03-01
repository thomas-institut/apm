<?php

namespace ThomasInstitut\EntitySystem;

/**
 * A class that can perform multiple commands with a single call.
 *
 * A command set is a series of commands that the class can perform in a single call.
 * For example, a series of database additions and updates in a single transaction.
 *
 */
interface WithCommandSets
{

    /**
     * Performs a command set.
     *
     * The idea is that perform the commands in one go and if there are errors in some of the commands
     * it would be as if no command as run. A typical example is a series of data creations, deletions and updates
     * in a single database transaction where the transaction is rolled back if there are errors.
     *
     * Each class defines what the $setId and $commands array should look like and what the result
     * array will be.
     *
     * In a typical use case, $setId is an integer or a string class constant and
     * $commands is of command spec each one with a pre-defined command id and a set of parameters. For example
     *
     *   [  [ someCommand, [ param1, param2, ... ], [ otherCommand, [ [param1, param2, ...] ... ]
     *
     * @param int|string $setId
     * @param array $commands
     * @return array
     */
    public function performCommandSet(int|string $setId, array $commands) : array;
}