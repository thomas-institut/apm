<?php

namespace ThomasInstitut\AuthService;

use ThomasInstitut\AuthService\Exception\InvalidAuthorizationCode;
use ThomasInstitut\AuthService\Exception\InvalidToken;
use ThomasInstitut\AuthService\Exception\UnacceptablePasswordException;
use ThomasInstitut\AuthService\Exception\UserAlreadyExistsException;
use ThomasInstitut\AuthService\Exception\UserNotFoundException;
use ThomasInstitut\AuthService\Exception\WrongCredentialsException;

/**
 *
 *  2023-Sep-06
 *
 *  The idea is to eventually separate user management from APM altogether and leave it to a single system common to
 *  APM, DARE and Bilderberg.
 *
 *  Bilderberg is the easiest case because it may never have users of its own. APM users should by default be
 *  able to log into Bilderberg and get a listing of all documents available. Actually, it may be desirable to integrate
 *  that into APM as well so that there's no need for a regular user to visit Bilderberg at all.  Some users, however,
 *  must be able to manage the documents in Bilderberg: add/delete/edit documents. The common user manager should be
 *  able to provide basic authorization services as well.
 *
 *  DARE's case is more complex because DARE will probably need to have users that do not need to work on APM. DARE users
 *  should be able to mark documents, save searches, manipulate some basic display settings, etc. This is all unrelated
 *  to APM.  Any edition of DARE data will be done by APM. By default, APM users should have full access to DARE.
 *
 *  For DARE's case, the common user manager may be required to provide some sort of automated user registration with
 *  email confirmation for example.
 *
 *  APM requires that users have a Person entry as well. The common user manager should be able to store the APM person
 *  ID as well.
 */





/**
 * Interface to a generic authentication/authorization (Auth) service
 *
 * An Auth service stores authentication and authorization data plus a number of metadata items for a set of users
 * in different contexts. Each user is uniquely identified by an integer user ID, a unique username string and a
 * unique email address.
 *
 * A context is a named entity to which users can belong and in which they are allowed to perform some actions,
 * have certain roles and be part of certain groups. For example, a user in the context 'apm' could be defined
 * so that they have the role 'root' and belong to the group 'admins'. It's up to the system (i.e., APM) to
 * interpret what exactly that means.
 *
 */
interface AuthServiceInterface
{

    /**
     * Returns the user ID for the given username/email address.
     * Returns -1 if the user does not exist
     * @param string $usernameOrEmailAddress
     * @return int
     */
    public function getUserId(string $usernameOrEmailAddress) : int;

    /**
     * Returns true if the user with the given $userId is defined in the system
     *
     * @param int $userId
     * @return bool
     */
    public function userExists(int $userId) : bool;

    /**
     * Returns a user's profile.
     * Errors should be handled with exceptions.
     * @param int $userId
     * @return UserProfile
     * @throws UserNotFoundException
     */
    public function getUserProfile(int $userId) : UserProfile;


    /**
     * Updates a user's metadata with the given new info.
     * $newMetadata is an associative array with all the metadata variables that
     * should be updated.
     * @param int $userId
     * @param array $newMetadata
     * @return void
     */
    public function updateUserMetadata(int $userId, array $newMetadata) : void;

    /**
     * Replaces all the user's contexts with new ones
     * @param int $userId
     * @param AuthorizationContext[] $contexts
     * @return void
     * @throws UserNotFoundException
     */
    public function setContexts(int $userId, array $contexts) : void;


    /**
     * Updates a single authorization context
     * @param int $userId
     * @param string $contextName
     * @param AuthorizationContext $context
     * @return void
     * @throws UserNotFoundException
     */
    public function updateContext(int $userId, string $contextName, AuthorizationContext $context): void;


    /**
     * Creates a user with the given metadata and contexts. Unless explicitly stated, the user will be disabled
     * by default. Returns the created user's ID.
     * @param string $userName
     * @param string $emailAddress
     * @param array $metadata
     * @param AuthorizationContext[] $contexts
     * @param bool $enable
     * @return int
     * @throws UserAlreadyExistsException
     */
    public function createUser(string $userName, string $emailAddress, array $metadata, array $contexts, bool $enable = false) : int;


    /**
     * Set the password for a user
     * @param int $userId
     * @param string $newPassword
     * @return void
     * @throws UnacceptablePasswordException
     */
    public function setUserPassword(int $userId, string $newPassword) : void;


    /**
     * Enables a user so that they can potentially be authenticated or authorized in the system.
     * No changes are made to individual contexts, so the user may not be authorized anywhere in
     * spite of being enabled.
     *
     * @param int $userId
     * @return void
     * @throws UserNotFoundException
     */
    public function enableUser(int $userId) : void;


    /**
     * Disables a user.
     * @param int $userId
     * @return void
     */
    public function disableUser(int $userId): void;


    /**
     * Requests an authorization code for a user in the given context using the given password as
     * credentials.
     *
     * The returned authorization code allows the client system to request tokens within a certain
     * relatively short period of time.
     *
     * Having this intermediate step between entering the user credentials and getting authorization tokens
     * allows the client system to have an easy to implement single point where to process authentication requests by
     * users. This is basically the way OAuth works.
     *
     * The idea is that when an end user that is not yet logged in tries to access a secured URL, the system redirects
     * the browser to a login page where they will enter their credentials. This login page is used by all the contexts
     * in the system. The software that process the credentials form in this login page requests an authorization
     * code from the AuthService using the end user's credentials and, if the user is authorized,
     * redirects the browser to a URL with a GET request with the authentication code and URL the end user was trying
     * to access. The controller for this URL asks the Auth service for tokens, gets them and stores them, for example
     * in browser cookies, and redirects again to the URL the user wanted to visit in the first place.
     *
     * Without the intermediate step of authorization codes, the
     *
     * @param int $userId
     * @param string $context
     * @param string $state a string that may serve to identify the client's state when making the request.
     * @param string $password
     * @return string
     * @throws WrongCredentialsException
     */
    public function requestAuthorizationCode(int $userId, string $context, string $state, string $password) : string;


    /**
     * Returns an associative array with a standard OAuth object
     *    returnObject = [
     *      'token_type' => 'Bearer',
     *      'expires_in' => ttl   // in seconds
     *      'access_token' => someToken
     *      'refresh_token' => someToken // optional
     *      'id_token' => someToken // optional
     *    ]
     *
     * Tokens themselves are not defined in this interface, but they're meant to be cryptographically signed
     * strings.
     *
     * The access token is meant to be presented by end user (e.g. through a browser cookie) as proof of their
     * authorization to access some desired resource.
     *
     * The refresh token is meant to be used by the system to ask the User Manager for a new access token without
     * having the end user provide their credentials again.
     *
     * The id token is meant to encode some basic information about the identity of the end user, for example
     * a user id, a username, an email address, etc.
     *
     * @param string $authorizationCode
     * @return array
     * @throws InvalidAuthorizationCode
     */
    public function requestTokens(string $authorizationCode) : array;


    /**
     * @param string $refreshToken
     * @return array
     * @throws InvalidToken
     */
    public function requestTokenRefresh(string $refreshToken) : array;


}