# Frollz

## Components



### Frollz API

1. All code is in the folder `frollz-api`
2. A backend application written in nestjs
3. All data in the back end is written to arangodb
4. Objects
    1. Film Formats - A dimensional description for a film stock
        - This has the following attributes
            - Form Factor
                - `Roll`
                - `Sheet`
                - `Instant`
                - `100ft Bulk`
                - `400ft Bulk`
            - Format
                - `35mm`
                - `110`
                - `Mini`
                - `Wide`
                - `Square`
                - `120`
                - `220`
                - `4x5`
                - `8x10`
                - `I-Type`
                - `600`
                - `SX-70`
                - `GO`
    
    1. Stock - A stock is type of film used for photography. A stock has the following attributes
        - Format - One of the film formats
        - Process - One of the following ways in which a film is processed
            - `ECN-2`
            - `E-6`
            - `C-41`
            - `Black & White`
        - Manufacturer - who made the film
        - Brand - the brand that the film is marketed under
        - Base Stock - a stock that this stock is based on (mainly used when a cine stock is reformatted for stills)
        - Speed - The ISO rating of the film
        - Tags - a freeform collection of descriptors for 
        - Box Image URL- an Image of the box for display.

           
    1. Roll - An individual instance of a Film Stock. 
        - Stock - the stock of the film
        - Roll Id - format of `roll-{stock name}-ISO8601 Date Hashed
        - State
            - `Frozen`
            - `Refridgerated`
            - `Shelfed`
            - `Loaded`
            - `Finished`
            - `Developed`
        - Images - A url to a albumn for of images from this roll
        - Date Obtained - The ISO 8601 date of when the roll was obtained
        - Obtainment Method - How the roll was obtain
            - `Gift`
            - `Purchase`
        - Obtained From - Who the film was obtained from
        - Expiration Date
        - Times Exposed to x-rays
    
    1. Roll States - A collection of the states that a film roll goes through
        - State
        - Roll ID
        - State ID - uuid
        - Date - the date of the state transition
        - Notes - any notes about the state transition


### Frollz UI

1. All code is in the folder `frollz-ui`
2. A front end application built using vue
3. All code written in typescript
4. Using tailwind-css for styles
