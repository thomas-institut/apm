<?php


namespace APM\Api;

use APM\System\Person\PersonManagerInterface;
use APM\System\Person\PersonNotFoundException;
use APM\System\User\UserManagerInterface;
use APM\System\User\UserNotFoundException;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use ThomasInstitut\EntitySystem\Tid;

class ApiSystem extends ApiController
{
    const string CLASS_NAME = 'System';

    public function __construct(
        ContainerInterface                      $ci,
        private readonly UserManagerInterface   $userManager,
        private readonly PersonManagerInterface $personManager)
    {
        parent::__construct($ci);
    }

    public function whoAmI(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $userInfo = $this->getSiteUserInfo();
        return $this->responseWithJson($response, $userInfo);
    }

    /**
     *
     * Gets an array with info about the user.
     *
     */
    private function getSiteUserInfo(): array
    {
        try {
            $userData = $this->userManager->getUserData($this->apiUserId);
            $personData = $this->personManager->getPersonEssentialData($this->apiUserId);

            $userInfo = $userData->getExportObject();
            unset($userInfo['passwordHash']);
            $userInfo['name'] = $personData->name;
            $userInfo['email'] = '';
            $userInfo['isRoot'] = $userData->root;
            $userInfo['manageUsers'] = $userData->root;
            $userInfo['tidString'] = Tid::toBase36String($userData->id);
            return $userInfo;
        } catch (UserNotFoundException|PersonNotFoundException $e) {
            $this->logger->error("System Error while getting SiteUserInfo: " . $e->getMessage(), [ 'userId' => $this->apiUserId ]);
            // should never happen
            return [];
        }
    }
}