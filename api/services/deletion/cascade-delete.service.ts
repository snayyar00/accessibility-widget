import database from '~/config/database.config';

export const deleteRelatedRecordsBySiteId = async (siteId: number): Promise<void> => {
  try {
    await database.raw('SET FOREIGN_KEY_CHECKS = 0');
    const deletionPromises = [
      database('impressions')
        .where('site_id', siteId)
        .del()
        .then((count) => console.log(`✓ Deleted ${count} impressions`))
        .catch(() => console.log('✗ No impressions to delete')),

      database('problem_reports')
        .where('site_id', siteId)
        .del()
        .then((count) => console.log(`✓ Deleted ${count} problem reports`))
        .catch(() => console.log('✗ No problem reports to delete')),

      database('unique_visitors')
        .where('site_id', siteId)
        .del()
        .then((count) => console.log(`✓ Deleted ${count} unique visitors`))
        .catch((e) => console.log('✗ No unique visitors to delete',e)),

      database('accessibility_reports')
        .where('allowed_sites_id', siteId)
        .del()
        .then((count) => console.log(`✓ Deleted ${count} accessibility reports`))
        .catch(() => console.log('✗ No accessibility reports to delete')),

      database('accessibility_scans')
        .where('site_id', siteId)
        .del()
        .then((count) => console.log(`✓ Deleted ${count} accessibility scans`))
        .catch(() => console.log('✗ No accessibility scans to delete')),

      database('widget_settings')
        .where('allowed_site_id', siteId)
        .del()
        .then((count) => console.log(`✓ Deleted ${count} widget settings`))
        .catch(() => console.log('✗ No widget settings to delete')),

      database('sites_plans')
        .where('allowed_site_id', siteId)
        .del()
        .then((count) => console.log(`✓ Deleted ${count} site plans`))
        .catch(() => console.log('✗ No site plans to delete')),

      database('site_permissions')
        .where('allowed_site_id', siteId)
        .del()
        .then((count) => console.log(`✓ Deleted ${count} site permissions`))
        .catch(() => console.log('✗ No site permissions to delete')),
    ];

    await Promise.all(deletionPromises);

    await database.raw('SET FOREIGN_KEY_CHECKS = 1');

  } catch (error) {
    console.error(`Error during cascade deletion for site ID ${siteId}:`, error);
    
    try {
      await database.raw('SET FOREIGN_KEY_CHECKS = 1');
    } catch (fkError) {
      console.error('Failed to re-enable foreign key constraints:', fkError);
    }
    
    throw error;
  }
};
