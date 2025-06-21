import database from '~/config/database.config';

export const deleteRelatedRecordsBySiteId = async (siteId: number): Promise<void> => {

  try {
    const deletionPromises = [
      database('problem_reports')
        .where('site_id', siteId)
        .del()
        .then(() => console.log('✓ Deleted problem reports'))
        .catch(() => console.log('✗ No problem reports to delete')),

      database('impressions')
        .where('site_id', siteId)
        .del()
        .then(() => console.log('✓ Deleted impressions'))
        .catch(() => console.log('✗ No impressions to delete')),

      database('unique_visitors')
        .where('site_id', siteId)
        .del()
        .then(() => console.log('✓ Deleted unique visitors'))
        .catch(() => console.log('✗ No unique visitors to delete')),

      database('accessibility_reports')
        .where('allowed_sites_id', siteId)
        .del()
        .then(() => console.log('✓ Deleted accessibility reports'))
        .catch(() => console.log('✗ No accessibility reports to delete')),

      database('accessibility_scans')
        .where('site_id', siteId)
        .del()
        .then(() => console.log('✓ Deleted accessibility scans'))
        .catch(() => console.log('✗ No accessibility scans to delete')),

      database('visitor_interactions')
        .where('site_id', siteId)
        .del()
        .then(() => console.log('✓ Deleted visitor interactions'))
        .catch(() => console.log('✗ No visitor interactions to delete')),

      database('widget_settings')
        .where('allowed_site_id', siteId)
        .del()
        .then(() => console.log('✓ Deleted widget settings'))
        .catch(() => console.log('✗ No widget settings to delete')),

      database('sites_plans')
        .where('allowed_site_id', siteId)
        .del()
        .then(() => console.log('✓ Deleted site plans'))
        .catch(() => console.log('✗ No site plans to delete')),

      database('site_permissions')
        .where('allowed_site_id', siteId)
        .del()
        .then(() => console.log('✓ Deleted site permissions'))
        .catch(() => console.log('✗ No site permissions to delete')),
    ];

    await Promise.all(deletionPromises);

  } catch (error) {
    console.error(`Error during cascade deletion for site ID ${siteId}:`, error);
    throw error;
  }
};
