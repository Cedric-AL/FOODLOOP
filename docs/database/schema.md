# FoodLoop Database Schema

This document describes the planned core database entities for the FoodLoop project. These entities reflect the intended system requirements and are meant for early project planning and documentation.

## Entity Overview

### Users

Planned fields:

- `id`
- `email`
- `password`
- `first_name`
- `last_name`
- `phone`
- `role`
- `location`
- `verified`
- `created_at`
- `updated_at`

Purpose:

Stores user accounts and role information for donors, recipients, volunteers, drivers, and administrators.

### Food Items

Planned fields:

- `id`
- `donor_id`
- `title`
- `description`
- `category`
- `quantity`
- `unit`
- `expiry_date`
- `location`
- `latitude`
- `longitude`
- `available`
- `created_at`
- `updated_at`

Purpose:

Stores information about surplus food that may be available for redistribution.

### Donations

Planned fields:

- `id`
- `food_item_id`
- `recipient_id`
- `status`
- `scheduled_pickup`
- `completed_at`
- `notes`
- `created_at`
- `updated_at`

Purpose:

Tracks each donation request, confirmation, lifecycle update, and final completion status.

### Volunteer Assignments

Planned fields:

- `id`
- `volunteer_id`
- `donation_id`
- `task_type`
- `status`
- `assigned_at`
- `started_at`
- `completed_at`

Purpose:

Tracks volunteer participation in pickup and delivery tasks.

### Delivery Routes

Planned fields:

- `id`
- `driver_id`
- `donation_id`
- `pickup_location`
- `delivery_location`
- `status`
- `estimated_arrival`
- `actual_arrival`
- `created_at`

Purpose:

Stores route and logistics details for donation transport coordination.

## Planned Relationships

- A `user` can create many `food items` as a donor.
- A `food item` can be associated with multiple `donations`.
- A `donation` is linked to one recipient user and one donor-related food item.
- A `volunteer assignment` belongs to a volunteer and a donation.
- A `delivery route` belongs to a driver and a donation.

## Notes

This schema is intended for planning and future implementation. The actual database tables are not yet built in this repository setup stage.
