# API Behavior

Controllers → HTTP only
Services → business rules

All writes idempotent.

Event flow:
1 validate
2 transition check
3 device rules
4 insert event
5 update state
6 side effects
7 commit
