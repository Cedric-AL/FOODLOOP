package com.foodloop.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PickupExpiry {
    @PersistenceContext EntityManager em;

    // The conditional update takes row locks, so a concurrent handover cannot be lost.
    @Scheduled(fixedDelayString="${app.pickup-expiry-ms:60000}", initialDelay=60000)
    @Transactional
    public void expire() {
        em.createNativeQuery("update donations set status='CANCELLED', updated_at=current_timestamp, notes=concat(coalesce(notes,''), ' Automatically cancelled: pickup deadline passed without recorded handover.') where status in ('SUBMITTED','UNDER_REVIEW','AVAILABLE','MATCHED','SCHEDULED_FOR_PICKUP') and handover_at is null and food_item_id in (select id from food_items where pickup_available_until<=current_timestamp)").executeUpdate();
        em.createNativeQuery("update donation_requests set status=case when status='ACCEPTED' then 'CANCELLED' else 'REJECTED' end,updated_at=current_timestamp where status in ('PENDING','ACCEPTED') and donation_id in (select id from donations where status='CANCELLED')").executeUpdate();
    }
}
