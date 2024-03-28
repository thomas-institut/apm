This folder contains all the core definitions of the Apm Entity System:

* The system entity
* Entity types
* Value types
* Predicates

The file `Entities.php` contains all the ids associated with the different entities
as constants that can be used all around the Apm codebase.

The rest of the files contain specifics about each entity. All entities must have
a tid, a name and a description in English, and may have names and descriptions in 
other languages as well for the purpose of future Apm site translation. The class
`EntityDefinition` in the `Apm\System\EntitySystem\Kernel` namespace captures this information.

Other entity types have different required data, as specified in the different `*Definition`
classes in the Kernel namespace.
