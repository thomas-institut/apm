# APM Background Processes Re-design

Right now APM relies on apmd (src/bin/apmd) to rebuild and maintain important cache items as well as
to handle Typesense indexing for searches. This is done naively with a MySQL-based job queue and jobs 
using Fibers. I want to change this to a more reliable design:

- better parallelism (i.e. no reliance on Fibers)
- no stale/unnecessary jobs
- sensible error handling
- minimal intervention by system administrators in the production machine

I need you to grill me on the design goals and requirements, suggest alternatives and/or courses of
action, and, at the end, help me come up with a sensible plan with clearly delineated
development tasks, test strategy and implementation in production.

My initial design idea is to create one or more worker processes that use a queue managed in Valkey. 
These processes would be started by systemd in production and manually in the "Services" tab for 
development. 



