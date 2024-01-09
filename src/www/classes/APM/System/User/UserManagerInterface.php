<?php

namespace APM\System\User;

/**
 * Interface for the user-related operations
 *
 * Users in the APM are valid Person entities that can log in to the system.
 *
 * The user's tid is used to identify the user in all operations in the system,
 * but for login and profile display purposes, a userName is assigned as well.
 * In the future, email addresses may be used for login, but right now this
 * is not implemented.
 *
 * Users can have a number of flags set that can be used for diverse purposes
 * such as deciding whether a user is permitted to do a specific action or to
 * make the user have a certain role.
 *
 * There are three fundamental flags that are always reported explicitly by the
 * system:  root, disabled and readOnly.  Any other flag will be reported
 * as part of an array of set flags.
 *
 * For authentication purposes the system can store and verify a user's password
 * and maintains a list of authentication tokens per user and user agent.
 *
 */
interface UserManagerInterface
{

    /**
     * Returns true if the given tid corresponds to a valid
     * user in the system.
     *
     * @param int $tid
     * @return bool
     */
    public function isUser(int $tid) : bool;

    /**
     * Returns user data for the given user.
     * @param int $userTid
     * @return UserData
     * @throws UserNotFoundException
     */
    public function getUserData(int $userTid) : UserData;


    /**
     * Returns true if the given string is valid username
     *
     * Only checks the string itself, does not check if the userName is already
     * taken
     *
     * @param string $userName
     * @return bool
     */
    public function isUserNameValid(string $userName) : bool;


    /**
     * Returns true if the given string can be used as a flag in the system.
     * Normally, any non-empty alphanumeric string is a valid flag name
     * @param string $flagName
     * @return bool
     */
    public function isFlagNameValid(string $flagName) : bool;

    /**
     * Returns the tid for the given username.
     *
     * If the username does not exist, returns -1
     * @param string $userName
     * @return int
     */
    public function getUserTidForUserName(string $userName) : int;

    /**
     * Changes the username for a user
     *
     * @param int $userTid
     * @param string $newUserName
     * @return void
     * @throws UserNotFoundException
     * @throws InvalidUserNameException
     * @throws UserNameAlreadyInUseException
     */
    public function changeUserName(int $userTid, string $newUserName): void;


    /**
     * Creates a user with the given $tid and username
     *
     * The given $tid must correspond to a valid Person entity in the system
     * but this method does not check if this is the case.
     *
     * @param int $tid
     * @param string $userName
     * @return void
     * @throws InvalidUserNameException
     * @throws UserNameAlreadyInUseException
     */
    public function createUser(int $tid, string $userName) : void;


    /**
     * Returns true if the given flag is set of the given user.
     *
     * @param int $userTid
     * @param string $flag
     * @return bool
     * @throws UserNotFoundException
     */
    public function isSet(int $userTid, string $flag) : bool;

    /**
     * Sets a user's flag to the given value
     *
     * @param int $userTid
     * @param string $flag
     * @param bool $flagValue
     * @return void
     * @throws UserNotFoundException
     */
    public function set(int $userTid, string $flag, bool $flagValue = true) : void;


    /**
     * Retrieves the stored user token for the given user agent.
     *
     * If there's no such token, returns an empty string
     *
     * @param int $userTid
     * @param string $userAgent
     * @return string
     * @throws UserNotFoundException
     */
    public function getTokenByUserAgent(int $userTid, string $userAgent) : string;


    /**
     * Gets all the tokens for the given user as an array of tuples:
     *
     *  [ userAgent, token ]
     * @param int $userTid
     * @return array
     * @throws UserNotFoundException
     */
    public function getAllTokens(int $userTid) : array;

    /**
     * Stores a token for a user agent
     *
     * @param int $userTid
     * @param string $userAgent
     * @param string $token
     * @return void
     * @throws UserNotFoundException
     */
    public function storeToken(int $userTid, string $userAgent, string $token): void;


    /**
     * Deletes the user token for the given user agent
     *
     * @param int $userTid
     * @param string $userAgent
     * @return void
     * @throws UserNotFoundException
     */
    public function deleteToken(int $userTid, string $userAgent) : void;


    /**
     * Returns true is the given string can be used as a password in the system
     *
     * @param string $someStr
     * @return bool
     */
    public function isStringValidPassword(string $someStr) : bool;

    /**
     * Returns true if the given password is exactly the same as the stored password
     * for the given user
     *
     * @param int $userTid
     * @param string $password
     * @return bool
     * @throws UserNotFoundException
     */
    public function verifyPassword(int $userTid, string $password) : bool;


    /**
     * Stores the password for a user
     *
     * @param int $userTid
     * @param string $password
     * @return void
     * @throws UserNotFoundException
     * @throws InvalidPasswordException
     */
    public function storePassword(int $userTid, string $password) : void;


}