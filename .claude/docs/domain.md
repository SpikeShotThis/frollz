# Domain Model

FilmLot → Film → FilmFrame

Film lifecycle driven by events.
State transitions defined in filmTransitionMap.

Devices:
FilmDevice (camera, interchangeable_back, film_holder)

Slots:
Film holders track slots independently.

Loading:
camera_direct / interchangeable_back / film_holder_slot

Format logic defined in film-format-definition.ts
