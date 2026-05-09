Some ideas about how to implement projects in the context of APM's entity system and schema:

1. Projects are entities of type `EntityCollection`
2. Projects are collections of entities (documents, people, works, etc) and resources associated with entities (transcriptions, chunk editions, etc). The predicate `IsProject` designates an `EntityCollection` entity as project.
3. It is probably worthwhile to transform any editable resource in the system that is not an entity into one: chunk editions, multi-chunk editions, transcriptions. However, it may not be necessary.
4. Every single entity in the APM must belong to a single `EntityCollection` entity. This is set up at creation time and never changes. That is, direct transfers between projects are impossible.  
5. The following `EntityCollection` entities are predefined: `SystemEntities` (types, predicates, etc), `UserEntities` and `EntityCollections`.
6. APM users do not belong to a project. Rather, they can be *members* of a project. Every user is a member of at least one project, the user's personal project.
7. Every project must have at least one user designated as owner who can perform any operation on the project without restriction.
8. Users can create any number of projects without restriction.
9. The owner of a project can add other users to the project and assign them specific roles: writer, reader, etc.
10. The owner of the project can decide what non-owner members of the project can do, as well as the visibility of the project's entities and resources to users outside of the project. 
11. Owners and writers can create new entities and resources that belong to the project. This can be done by either (a) creating an entity directly, or (b) copying an entity's data from another project. In case (b), APM keeps track of who copied what so that is should be possible to trace the different incarnations of an entity across different projects. 
12. Entities can be tagged as inactive or archived in a project. This unlists the entity and prevents any future references to it.
13. Entities can only be merged into entities in the same project. 
14. Project resources and entities can only refer to and/or have statements about entities in the same project or in SystemData and Users. This means that when a resource or entity is copied from one project to another, all referenced entities and resources must be copied as well. If one of the referenced entities is not visible to the target project, the copy should not be allowed. Notice that since users do not belong to projects, they can, in theory, be referenced from anywhere in the system.
15. Even though direct transfers of entities are not possible, effective transfers from project A to B can be accomplished by copying the entity from A into B and by archiving it in A. 
 

Given this, the implementation strategy is as follows:

- Define predicates and system entities.
- Modify the core system to enforce the new rules about merges and to assign system entities to the `SystemEntities` collection.
- Assign all users to the `UserEntities` collection and create the users' personal projects.
- Create the project entity `AverroesProject` to hold any current entity that is not a user or a system entity. 
- Designate some users as owners of the AverroesProject and others just as writers or readers.
- Modify the user creation mechanism to create user projects when a user is created.
- Modify the current UI to show the Averroes Project as default

At this point the APM should look exactly the same as before, but with a project mechanism implemented in the background.

The next big step is to add UI for project management and switching between projects. 