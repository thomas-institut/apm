<?php

namespace APM\System\User;

use Psr\Log\LoggerAwareInterface;

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
 * Users can have a number of tags set that can be used for diverse purposes
 * such as deciding whether a user is permitted to do a specific action or to
 * make the user have a certain role.
 *
 * For permissions, the method isUserAllowedTo(someTag) checks the user has
 * someTag, but also returns true is the user is root
 *
 * There are three fundamental tags that are always reported explicitly by the
 * system:  root, disabled and readOnly.  Any other tag will be reported
 * as part of an array of set tags.
 *
 * For authentication purposes the system can store and verify a user's password
 * and maintains a list of authentication tokens per user and user agent.
 *
 */
interface UserManagerInterface extends LoggerAwareInterface
{

    /**
     * Returns an array with all the user tids
     * @return UserData[]
     */
    public function getAllUsersData() : array;

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
     * Returns true if the given userName is already
     * in use in the system
     *
     * @param string $userName
     * @return bool
     */
    public function isUserNameAlreadyInUse(string $userName) : bool;

    /**
     * Returns true if the given string can be used as a username
     * in the system.
     *
     * It does not check if the string is already in use as
     * a username.
     *
     * @param string $userName
     * @return bool
     */
    public function isStringValidUserName(string $userName) : bool;


    /**
     * Returns true if the given string can be used as a tag in the system.
     * Normally, any non-empty alphanumeric string is a valid tag name
     * @param string $tagName
     * @return bool
     */
    public function isStringValidTag(string $tagName) : bool;

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
     * Changes a user's email address
     *
     * The email address may be used for authentication purposes, and it's independent of any email
     * address associated with the user's Person entity.
     *
     * @param int $userTid
     * @param string $newEmailAddress
     * @return void
     * @throws UserNotFoundException
     * @throws InvalidEmailAddressException
     */
    public function changeEmailAddress(int $userTid, string $newEmailAddress) : void;


    /**
     * Creates a user with the given $tid and username
     *
     * The given $tid must correspond to a valid Person entity in the system
     * but this method does not check if this is the case.
     *
     * @param int $userTid
     * @param string $userName
     * @return void
     * @throws InvalidUserNameException
     * @throws UserNameAlreadyInUseException
     */
    public function createUser(int $userTid, string $userName) : void;


    /**
     * Disables a user.
     *
     * @param int $userTid
     * @return void
     * @throws UserNotFoundException
     */
    public function disableUser(int $userTid) : void;


    /**
     * Returns true if the given tag is set of the given user.
     *
     * @param int $userTid
     * @param string $tag
     * @return bool
     * @throws UserNotFoundException
     */
    public function hasTag(int $userTid, string $tag) : bool;

    /**
     * Adds the given tag to the user
     *
     * @param int $userTid
     * @param string $tag
     * @return void
     * @throws UserNotFoundException
     */
    public function addTag(int $userTid, string $tag) : void;

    /**
     * Removes the given tag from the user
     *
     * @param int $userTid
     * @param string $tag
     * @return void
     * @throws UserNotFoundException
     */
    public function removeTag(int $userTid, string $tag) : void;


    /**
     * Returns true if the user is root
     *
     * @param int $userTid
     * @return bool
     * @throws UserNotFoundException
     */
    public function isRoot(int $userTid) : bool;


    /**
     * Returns true if the user is enabled
     * @param int $userTid
     * @return bool
     * @throws UserNotFoundException
     */
    public function isEnabled(int $userTid): bool;


    /**
     * Returns true if the user is root or the user has the given tag
     * If $writeOperation is true, returns false is the user is readOnly
     *
     * @param int $userTid
     * @param string $operationTag
     * @param bool $writeOperation
     * @return bool
     * @throws UserNotFoundException
     */
    public function isUserAllowedTo(int $userTid, string $operationTag, bool $writeOperation = true): bool;

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
     * @param string $ipAddress
     * @param string $token
     * @return void
     * @throws UserNotFoundException
     */
    public function storeToken(int $userTid, string $userAgent, string $ipAddress, string $token): void;


    /**
     * Removes a token for a user.
     *
     * This effectively logs out the user from the system.
     * @param int $userTid
     * @param string $userAgent
     * @return void
     */
    public function removeToken(int $userTid, string $userAgent) : void;


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
     * Returns true if the user is not disabled, the stored password is not empty
     * and the given password matches the stored one.
     *
     * @param int $userTid
     * @param string $password
     * @return bool
     * @throws UserNotFoundException
     */
    public function verifyPassword(int $userTid, string $password) : bool;


    /**
     * Stores the password for a user.
     *
     * Implementations must actually store a password hash, not the password
     * string as it is given.
     *
     * @param int $userTid
     * @param string $password
     * @return void
     * @throws UserNotFoundException
     * @throws InvalidPasswordException
     */
    public function changePassword(int $userTid, string $password) : void;


}