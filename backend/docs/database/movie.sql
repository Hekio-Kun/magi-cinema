CREATE TABLE public.movie (
    movie_id serial4 NOT NULL,
    movie_name_vn varchar(255) NOT NULL,
    movie_name_english varchar(255) NULL,
    actor varchar(255) NULL,
    director varchar(255) NULL,
    content text NULL,
    duration int4 NULL,
    from_date date NULL,
    to_date date NULL,
    movie_production_company varchar(255) NULL,
    version varchar(50) NULL,
    large_image varchar(255) NULL,
    small_image varchar(255) NULL,
    status int4 NULL,
    created_at timestamptz NULL,
    updated_at timestamptz NULL,
    CONSTRAINT movie_pkey PRIMARY KEY (movie_id)
);

CREATE TABLE public.type (
    type_id serial4 NOT NULL,
    type_name varchar(100) NOT NULL,
    created_at timestamptz NULL,
    updated_at timestamptz NULL,
    CONSTRAINT type_pkey PRIMARY KEY (type_id),
    CONSTRAINT type_type_name_key UNIQUE (type_name)
);

CREATE TABLE public.movie_type (
    movie_id int4 NOT NULL,
    type_id int4 NOT NULL,
    CONSTRAINT movie_type_pkey PRIMARY KEY (movie_id, type_id),
    CONSTRAINT movie_type_movie_fk FOREIGN KEY (movie_id) REFERENCES public.movie(movie_id) ON DELETE CASCADE,
    CONSTRAINT movie_type_type_fk FOREIGN KEY (type_id) REFERENCES public.type(type_id) ON DELETE CASCADE
);

CREATE TABLE public.cinema_room (
    cinema_room_id serial4 NOT NULL,
    cinema_room_name varchar(100) NOT NULL,
    seat_quantity int4 NOT NULL,
    status int4 NULL,
    created_at timestamptz NULL,
    updated_at timestamptz NULL,
    CONSTRAINT cinema_room_pkey PRIMARY KEY (cinema_room_id)
);

CREATE TABLE public.seat (
    seat_id serial4 NOT NULL,
    cinema_room_id int4 NOT NULL,
    seat_row varchar(5) NOT NULL,
    seat_number int4 NOT NULL,
    seat_code varchar(10) NOT NULL,
    type varchar(20) NOT NULL,
    status varchar(20) NOT NULL,
    created_at timestamptz NULL,
    updated_at timestamptz NULL,
    CONSTRAINT seat_pkey PRIMARY KEY (seat_id),
    CONSTRAINT uk_seat_room_row_number UNIQUE (cinema_room_id, seat_row, seat_number),
    CONSTRAINT uk_seat_room_code UNIQUE (cinema_room_id, seat_code),
    CONSTRAINT seat_cinema_room_fk FOREIGN KEY (cinema_room_id) REFERENCES public.cinema_room(cinema_room_id)
);

CREATE TABLE public.showtime (
    showtime_id serial4 NOT NULL,
    movie_id int4 NOT NULL,
    cinema_room_id int4 NOT NULL,
    show_date date NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    status int4 NULL,
    created_at timestamptz NULL,
    updated_at timestamptz NULL,
    CONSTRAINT showtime_pkey PRIMARY KEY (showtime_id),
    CONSTRAINT showtime_movie_fk FOREIGN KEY (movie_id) REFERENCES public.movie(movie_id) ON DELETE CASCADE,
    CONSTRAINT showtime_cinema_room_fk FOREIGN KEY (cinema_room_id) REFERENCES public.cinema_room(cinema_room_id)
);

CREATE TABLE public.showtime_seat (
    showtime_seat_id serial4 NOT NULL,
    showtime_id int4 NOT NULL,
    seat_id int4 NOT NULL,
    status varchar(20) NOT NULL,
    created_at timestamptz NULL,
    updated_at timestamptz NULL,
    CONSTRAINT showtime_seat_pkey PRIMARY KEY (showtime_seat_id),
    CONSTRAINT uk_showtime_seat UNIQUE (showtime_id, seat_id),
    CONSTRAINT showtime_seat_showtime_fk FOREIGN KEY (showtime_id) REFERENCES public.showtime(showtime_id),
    CONSTRAINT showtime_seat_seat_fk FOREIGN KEY (seat_id) REFERENCES public.seat(seat_id)
);
