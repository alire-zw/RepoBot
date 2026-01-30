import { Telegraf } from 'telegraf';
import express from 'express';
import config from './config/env.js';
import { initDatabase } from './services/database.js';
import startHandler from './handlers/start.js';
import buySubscriptionHandler from './handlers/buySubscription.js';
import myAccountHandler from './handlers/myAccount.js';
import myConfigsHandler from './handlers/myConfigsHandler.js';
import myConfigListPageHandler from './handlers/myConfigListPageHandler.js';
import myConfigDetailHandler from './handlers/myConfigDetailHandler.js';
import myConfigBackHandler from './handlers/myConfigBackHandler.js';
import myConfigRegenerateHandler from './handlers/myConfigRegenerateHandler.js';
import myConfigQRHandler from './handlers/myConfigQRHandler.js';
import myConfigRenewHandler from './handlers/myConfigRenewHandler.js';
import myConfigRenewWalletHandler from './handlers/myConfigRenewWalletHandler.js';
import myConfigRenewCardHandler from './handlers/myConfigRenewCardHandler.js';
import helpHandler, { helpPlatformHandler } from './handlers/help.js';
import backHandler from './handlers/back.js';
import adminPanelHandler from './handlers/adminPanel.js';
import adminUsersStatsHandler from './handlers/adminUsersStats.js';
import chargeWalletHandler from './handlers/chargeWallet.js';
import chargeAmountHandler from './handlers/chargeAmount.js';
import chargeReceiptHandler from './handlers/chargeReceipt.js';
import chargeBackToWalletHandler from './handlers/chargeBackToWallet.js';
import chargeApproveHandler from './handlers/chargeApprove.js';
import chargeRejectHandler from './handlers/chargeReject.js';
import chargeRejectReasonHandler from './handlers/chargeRejectReason.js';
import adminBalanceManagementHandler from './handlers/adminBalanceManagement.js';
import adminBalanceSearchHandler from './handlers/adminBalanceSearch.js';
import adminBalanceEditHandler from './handlers/adminBalanceEdit.js';
import adminBalanceHandler from './handlers/adminBalanceHandler.js';
import adminBalanceSearchHandlerText from './handlers/adminBalanceSearchHandler.js';
import adminBalanceDecreaseHandler from './handlers/adminBalanceDecrease.js';
import adminBlockUserHandler from './handlers/adminBlockUser.js';
import channelSearchHandler from './handlers/channelSearchHandler.js';
import channelSearchHandlerText from './handlers/channelSearchHandlerText.js';
import channelLockHandler from './handlers/channelLockHandler.js';
import channelUnlockHandler from './handlers/channelUnlockHandler.js';
import channelDetailHandler from './handlers/channelDetailHandler.js';
import channelEditLabelHandler from './handlers/channelEditLabelHandler.js';
import channelEditLabelTextHandler from './handlers/channelEditLabelTextHandler.js';
import channelDeleteHandler from './handlers/channelDeleteHandler.js';
import channelDeleteConfirmHandler from './handlers/channelDeleteConfirmHandler.js';
import channelsManagementHandler from './handlers/channelsManagementHandler.js';
import channelAddHandler from './handlers/channelAddHandler.js';
import channelForwardHandler from './handlers/channelForwardHandler.js';
import channelSaveHandler from './handlers/channelSaveHandler.js';
import channelListHandler from './handlers/channelListHandler.js';
import channelListPageHandler from './handlers/channelListPageHandler.js';
import transferWalletHandler from './handlers/transferWallet.js';
import transferAmountHandler from './handlers/transferAmount.js';
import transferConfirmHandler from './handlers/transferConfirm.js';
import transferCancelHandler from './handlers/transferCancel.js';
import verifyMembershipHandler from './handlers/verifyMembershipHandler.js';
import serversManagementHandler from './handlers/serversManagementHandler.js';
import serverAddHandler from './handlers/serverAddHandler.js';
import serverAddTextHandler from './handlers/serverAddTextHandler.js';
import serverListHandler from './handlers/serverListHandler.js';
import serverListPageHandler from './handlers/serverListPageHandler.js';
import serverDetailHandler from './handlers/serverDetailHandler.js';
import serverDeleteHandler from './handlers/serverDeleteHandler.js';
import serverDeleteConfirmHandler from './handlers/serverDeleteConfirmHandler.js';
import serverToggleActiveHandler from './handlers/serverToggleActiveHandler.js';
import serverRefreshHandler from './handlers/serverRefreshHandler.js';
import categoriesManagementHandler from './handlers/categoriesManagementHandler.js';
import categoryAddHandler from './handlers/categoryAddHandler.js';
import categoryAddTextHandler from './handlers/categoryAddTextHandler.js';
import categoryListHandler from './handlers/categoryListHandler.js';
import categoryListPageHandler from './handlers/categoryListPageHandler.js';
import categoryDetailHandler from './handlers/categoryDetailHandler.js';
import categoryEditHandler from './handlers/categoryEditHandler.js';
import categoryEditTextHandler from './handlers/categoryEditTextHandler.js';
import categoryDeleteHandler from './handlers/categoryDeleteHandler.js';
import categoryDeleteConfirmHandler from './handlers/categoryDeleteConfirmHandler.js';
import planAddHandler from './handlers/planAddHandler.js';
import planAddTextHandler from './handlers/planAddTextHandler.js';
import planListHandler from './handlers/planListHandler.js';
import planListPageHandler from './handlers/planListPageHandler.js';
import planDetailHandler from './handlers/planDetailHandler.js';
import planCategorySelectHandler from './handlers/planCategorySelectHandler.js';
import planServerSelectHandler from './handlers/planServerSelectHandler.js';
import planInboundSelectHandler from './handlers/planInboundSelectHandler.js';
import planConfirmSaveHandler from './handlers/planConfirmSaveHandler.js';
import planConfirmCancelHandler from './handlers/planConfirmCancelHandler.js';
import planAddCancelHandler from './handlers/planAddCancelHandler.js';
import planEditNameHandler from './handlers/planEditNameHandler.js';
import planEditVolumeHandler from './handlers/planEditVolumeHandler.js';
import planEditDurationHandler from './handlers/planEditDurationHandler.js';
import planEditCategoryHandler from './handlers/planEditCategoryHandler.js';
import planEditCategorySelectHandler from './handlers/planEditCategorySelectHandler.js';
import planEditServerHandler from './handlers/planEditServerHandler.js';
import planEditServerSelectHandler from './handlers/planEditServerSelectHandler.js';
import planEditInboundSelectHandler from './handlers/planEditInboundSelectHandler.js';
import planEditCapacityHandler from './handlers/planEditCapacityHandler.js';
import planEditPriceHandler from './handlers/planEditPriceHandler.js';
import planEditTextHandler from './handlers/planEditTextHandler.js';
import planDeleteHandler from './handlers/planDeleteHandler.js';
import planDeleteConfirmHandler from './handlers/planDeleteConfirmHandler.js';
import purchaseServerHandler from './handlers/purchaseServerHandler.js';
import purchaseCategoryHandler from './handlers/purchaseCategoryHandler.js';
import purchasePlanHandler from './handlers/purchasePlanHandler.js';
import purchaseWalletHandler from './handlers/purchaseWalletHandler.js';
import purchaseInsufficientDismissHandler from './handlers/purchaseInsufficientDismissHandler.js';
import purchaseCardHandler from './handlers/purchaseCardHandler.js';
import purchaseBackToServerHandler from './handlers/purchaseBackToServerHandler.js';
import planOrderReceiptHandler from './handlers/planOrderReceiptHandler.js';
import planOrderApproveHandler from './handlers/planOrderApproveHandler.js';
import planOrderRejectHandler from './handlers/planOrderRejectHandler.js';
import renewalApproveHandler from './handlers/renewalApproveHandler.js';
import renewalRejectHandler from './handlers/renewalRejectHandler.js';
import {
  purchaseDeliveredHelpHandler,
  purchaseDeliveredMenuHandler
} from './handlers/purchaseDeliveredActions.js';
import botSettingsHandler from './handlers/botSettingsHandler.js';
import botSettingsMethodHandler from './handlers/botSettingsMethodHandler.js';
import botSettingsCardsListHandler from './handlers/botSettingsCardsListHandler.js';
import botSettingsCardAddHandler from './handlers/botSettingsCardAddHandler.js';
import botSettingsCardInfoHandler from './handlers/botSettingsCardInfoHandler.js';
import botSettingsCardDeleteHandler from './handlers/botSettingsCardDeleteHandler.js';
import botSettingsPvSetHandler from './handlers/botSettingsPvSetHandler.js';
import botSettingsSupportSetHandler from './handlers/botSettingsSupportSetHandler.js';
import botSettingsCardAddTextHandler from './handlers/botSettingsCardAddTextHandler.js';
import botSettingsPvSetTextHandler from './handlers/botSettingsPvSetTextHandler.js';
import botSettingsSupportSetTextHandler from './handlers/botSettingsSupportSetTextHandler.js';
import panelSettingsHandler from './handlers/panelSettingsHandler.js';
import panelSettingsTrialHandler, { showTrialMenu } from './handlers/panelSettingsTrialHandler.js';
import panelSettingsTrialServerSelectHandler from './handlers/panelSettingsTrialServerSelectHandler.js';
import panelSettingsTrialInboundSelectHandler from './handlers/panelSettingsTrialInboundSelectHandler.js';
import panelSettingsCleanHandler from './handlers/panelSettingsCleanHandler.js';
import panelSettingsBackupHandler from './handlers/panelSettingsBackupHandler.js';
import panelSettingsBackupChannelForwardHandler from './handlers/panelSettingsBackupChannelForwardHandler.js';
import trialClaimHandler from './handlers/trialClaimHandler.js';
import { schedulePanelJobs } from './jobs/panelJobs.js';

const bot = new Telegraf(config.BOT_TOKEN);

bot.start(startHandler);
bot.action('verify_membership', verifyMembershipHandler);
bot.action('buy_subscription', buySubscriptionHandler);
bot.action(/^purchase_server_(\d+)$/, purchaseServerHandler);
bot.action(/^purchase_cat_(\d+)$/, purchaseCategoryHandler);
bot.action(/^purchase_plan_(\d+)$/, purchasePlanHandler);
bot.action('purchase_wallet', purchaseWalletHandler);
bot.action('purchase_insufficient_dismiss', purchaseInsufficientDismissHandler);
bot.action('purchase_card', purchaseCardHandler);
bot.action('purchase_back_to_server', purchaseBackToServerHandler);
bot.action(/^plan_order_approve_(\d+)$/, planOrderApproveHandler);
bot.action(/^plan_order_reject_(\d+)$/, planOrderRejectHandler);
bot.action(/^plan_order_(done|rejected)$/, (ctx) => ctx.answerCbQuery());
bot.action(/^renewal_approve_(\d+)$/, renewalApproveHandler);
bot.action(/^renewal_reject_(\d+)$/, renewalRejectHandler);
bot.action(/^renewal_(done|rejected)$/, (ctx) => ctx.answerCbQuery());
bot.action('purchase_delivered_help', purchaseDeliveredHelpHandler);
bot.action('purchase_delivered_menu', purchaseDeliveredMenuHandler);
bot.action('my_account', myAccountHandler);
bot.action('my_configs', myConfigsHandler);
bot.action('myconfig_list_header', (ctx) => ctx.answerCbQuery());
bot.action(/^myconfig_list_page_(\d+)$/, myConfigListPageHandler);
bot.action(/^myconfig_detail_(\d+)$/, myConfigDetailHandler);
bot.action(/^myconfig_detail_vol_(\d+)$/, (ctx) => ctx.answerCbQuery());
bot.action(/^myconfig_detail_days_(\d+)$/, (ctx) => ctx.answerCbQuery());
bot.action('myconfig_back_to_list', myConfigBackHandler);
bot.action(/^myconfig_regen_(\d+)$/, myConfigRegenerateHandler);
bot.action(/^myconfig_qr_(\d+)$/, myConfigQRHandler);
bot.action(/^myconfig_renew_wallet_(\d+)$/, myConfigRenewWalletHandler);
bot.action(/^myconfig_renew_card_(\d+)$/, myConfigRenewCardHandler);
bot.action(/^myconfig_renew_(\d+)$/, myConfigRenewHandler);
bot.action('help', helpHandler);
bot.action('help_android', (ctx) => helpPlatformHandler(ctx, 'android'));
bot.action('help_ios', (ctx) => helpPlatformHandler(ctx, 'ios'));
bot.action('help_windows', (ctx) => helpPlatformHandler(ctx, 'windows'));
bot.action('help_macos', (ctx) => helpPlatformHandler(ctx, 'macos'));
bot.action('back_to_main', backHandler);
bot.action('admin_panel', adminPanelHandler);
bot.action('admin_users_stats', adminUsersStatsHandler);
bot.action('admin_users_total', adminUsersStatsHandler);
bot.action('admin_users_premium', adminUsersStatsHandler);
bot.action('admin_users_total_value', adminUsersStatsHandler);
bot.action('admin_users_premium_value', adminUsersStatsHandler);
bot.action('admin_users_time_stats', adminUsersStatsHandler);
bot.action('admin_users_today', adminUsersStatsHandler);
bot.action('admin_users_week', adminUsersStatsHandler);
bot.action('admin_users_month', adminUsersStatsHandler);
bot.action('admin_users_today_value', adminUsersStatsHandler);
bot.action('admin_users_week_value', adminUsersStatsHandler);
bot.action('admin_users_month_value', adminUsersStatsHandler);
bot.action('admin_refresh_stats', adminUsersStatsHandler);
bot.action('admin_balance_management', adminBalanceManagementHandler);
bot.action('admin_balance_search', adminBalanceSearchHandler);
bot.action(/^admin_balance_edit(?:_\d+)?$/, adminBalanceEditHandler);
bot.action(/^admin_balance_decrease(?:_\d+)?$/, adminBalanceDecreaseHandler);
bot.action(/^admin_block_\d+$/, adminBlockUserHandler);
bot.action(/^admin_unblock_\d+$/, adminBlockUserHandler);
bot.action('channel_management', channelsManagementHandler);
bot.action('channel_add', channelAddHandler);
bot.action('channel_list', channelListHandler);
bot.action(/^channel_list_page_\d+$/, channelListPageHandler);
bot.action(/^channel_save_\d+$/, channelSaveHandler);
bot.action('channel_search', channelSearchHandler);
bot.action(/^channel_search_id_(-?\d+)$/, channelSearchHandler);
bot.action(/^channel_detail_(-?\d+)$/, channelDetailHandler);
bot.action(/^channel_edit_label_(-?\d+)$/, channelEditLabelHandler);
bot.action(/^channel_delete_(-?\d+)$/, channelDeleteHandler);
bot.action(/^channel_delete_confirm_(-?\d+)$/, channelDeleteConfirmHandler);
bot.action(/^channel_lock_(-?\d+)$/, channelLockHandler);
bot.action(/^channel_unlock_(-?\d+)$/, channelUnlockHandler);
bot.action('charge_wallet', (ctx) => {
  console.log('[index.js] charge_wallet action received');
  console.log('[index.js] Callback data:', ctx.callbackQuery?.data);
  return chargeWalletHandler(ctx);
});
bot.action('charge_back_to_wallet', chargeBackToWalletHandler);
bot.action(/^charge_approve_(\d+)$/, chargeApproveHandler);
bot.action(/^charge_reject_(\d+)$/, chargeRejectHandler);
bot.action('transfer_wallet', transferWalletHandler);
bot.action('transfer_confirm', transferConfirmHandler);
bot.action('transfer_cancel', transferCancelHandler);
bot.action('server_management', serversManagementHandler);
bot.action('servers_list_header', (ctx) => ctx.answerCbQuery());
bot.action('server_add', serverAddHandler);
bot.action('server_list', serverListHandler);
bot.action(/^server_list_page_(\d+)$/, serverListPageHandler);
bot.action(/^server_detail_(\d+)$/, serverDetailHandler);
bot.action(/^server_toggle_(\d+)$/, serverToggleActiveHandler);
bot.action(/^server_refresh_(\d+)$/, serverRefreshHandler);
bot.action(/^server_delete_(\d+)$/, serverDeleteHandler);
bot.action(/^server_delete_confirm_(\d+)$/, serverDeleteConfirmHandler);
bot.action(/^server_(general_info|name|ip|name_value|ip_value|domain|port|domain_value|port_value|settings_info|path|remark|path_value|remark_value|stats_info|inbounds|clients|inbounds_value|clients_value|online|status|online_value|status_value|status_settings|toggle_active|status_display|traffic_info|upload|download|upload_value|download_value|total_traffic|total_traffic_value)$/, (ctx) => ctx.answerCbQuery());
bot.action('bot_settings', botSettingsHandler);
bot.action('bot_settings_method_card', botSettingsMethodHandler);
bot.action('bot_settings_method_pvid', botSettingsMethodHandler);
bot.action('bot_settings_cards_list', botSettingsCardsListHandler);
bot.action('bot_settings_card_add', botSettingsCardAddHandler);
bot.action(/^bot_settings_card_info_(\d+)$/, botSettingsCardInfoHandler);
bot.action(/^bot_settings_card_delete_(\d+)$/, botSettingsCardDeleteHandler);
bot.action('bot_settings_pv_set', botSettingsPvSetHandler);
bot.action('bot_settings_support_set', botSettingsSupportSetHandler);
bot.action('panel_settings', panelSettingsHandler);
bot.action('panel_settings_trial', panelSettingsTrialHandler);
bot.action('panel_settings_trial_off', panelSettingsTrialHandler);
bot.action('panel_settings_trial_server_list', panelSettingsTrialHandler);
bot.action('panel_settings_trial_reset', panelSettingsTrialHandler);
bot.action('panel_settings_trial_reset_confirm', panelSettingsTrialHandler);
bot.action(/^panel_settings_trial_server_(\d+)$/, panelSettingsTrialServerSelectHandler);
bot.action(/^panel_settings_trial_inbound_(\d+)_(.+)$/, panelSettingsTrialInboundSelectHandler);
bot.action('panel_settings_clean', panelSettingsCleanHandler);
bot.action('panel_settings_backup', panelSettingsBackupHandler);
bot.action('panel_settings_backup_toggle', panelSettingsBackupHandler);
bot.action('panel_settings_backup_channel', panelSettingsBackupHandler);
bot.action('trial_claim', trialClaimHandler);
bot.action('category_management', categoriesManagementHandler);
bot.action('categories_list_header', (ctx) => ctx.answerCbQuery());
bot.action('category_add', categoryAddHandler);
bot.action('category_list', categoryListHandler);
bot.action(/^category_list_page_(\d+)$/, categoryListPageHandler);
bot.action(/^category_detail_(\d+)$/, categoryDetailHandler);
bot.action(/^category_edit_(\d+)$/, categoryEditHandler);
bot.action(/^category_delete_(\d+)$/, categoryDeleteHandler);
bot.action(/^category_delete_confirm_(\d+)$/, categoryDeleteConfirmHandler);
bot.action('plan_add', planAddHandler);
bot.action('plan_add_cancel', planAddCancelHandler);
bot.action('plan_list', planListHandler);
bot.action(/^plan_list_page_(\d+)$/, planListPageHandler);
bot.action(/^plan_detail_(\d+)$/, planDetailHandler);
bot.action(/^plan_category_(\d+)$/, planCategorySelectHandler);
bot.action(/^plan_server_(\d+)$/, planServerSelectHandler);
bot.action(/^plan_inbound_\d+_\d+$/, planInboundSelectHandler);
bot.action('plan_confirm_save', planConfirmSaveHandler);
bot.action('plan_confirm_cancel', planConfirmCancelHandler);
bot.action(/^plan_info_(header|name|volume|duration|category|server|inbound|capacity|price)$/, (ctx) => ctx.answerCbQuery());
bot.action(/^plan_edit_name_(\d+)$/, planEditNameHandler);
bot.action(/^plan_edit_volume_(\d+)$/, planEditVolumeHandler);
bot.action(/^plan_edit_duration_(\d+)$/, planEditDurationHandler);
bot.action(/^plan_edit_category_(\d+)$/, planEditCategoryHandler);
bot.action(/^plan_edit_category_select_\d+_\d+$/, planEditCategorySelectHandler);
bot.action(/^plan_edit_server_(\d+)$/, planEditServerHandler);
bot.action(/^plan_edit_server_select_\d+_\d+$/, planEditServerSelectHandler);
bot.action(/^plan_edit_inbound_select_\d+_\d+_\d+$/, planEditInboundSelectHandler);
bot.action(/^plan_edit_capacity_(\d+)$/, planEditCapacityHandler);
bot.action(/^plan_edit_price_(\d+)$/, planEditPriceHandler);
bot.action(/^plan_delete_(\d+)$/, planDeleteHandler);
bot.action(/^plan_delete_confirm_(\d+)$/, planDeleteConfirmHandler);

// Handle forwarded messages for channel adding (must be before other message handlers)
bot.use(async (ctx, next) => {
  // Check if message is forwarded from a channel and user is in adding state
  if (ctx.message) {
    console.log('[index.js] Message received:', {
      messageId: ctx.message.message_id,
      hasForward: !!ctx.message.forward_from_chat,
      forwardChatType: ctx.message.forward_from_chat?.type,
      forwardChatId: ctx.message.forward_from_chat?.id,
      forwardChatTitle: ctx.message.forward_from_chat?.title,
      forwardFrom: ctx.message.forward_from,
      forwardSenderName: ctx.message.forward_sender_name,
      forwardDate: ctx.message.forward_date,
      userId: ctx.from?.id
    });
    
    if (ctx.message.forward_from_chat && ctx.message.forward_from_chat.type === 'channel') {
      const backupHandled = await panelSettingsBackupChannelForwardHandler(ctx);
      if (backupHandled) return;
      const forwardHandled = await channelForwardHandler(ctx);
      if (forwardHandled) return;
    }
  }
  await next();
});

bot.on('text', async (ctx, next) => {
  const serverAddHandled = await serverAddTextHandler(ctx);
  if (serverAddHandled) return;
  const categoryAddHandled = await categoryAddTextHandler(ctx);
  if (categoryAddHandled) return;
  const categoryEditHandled = await categoryEditTextHandler(ctx);
  if (categoryEditHandled) return;
  const planAddHandled = await planAddTextHandler(ctx);
  if (planAddHandled) return;
  const planEditHandled = await planEditTextHandler(ctx);
  if (planEditHandled) return;
  const handled = await chargeRejectReasonHandler(ctx);
  if (!handled) {
    const balanceHandled = await adminBalanceHandler(ctx);
    if (!balanceHandled) {
      const searchHandled = await adminBalanceSearchHandlerText(ctx);
      if (!searchHandled) {
        const channelSearchHandled = await channelSearchHandlerText(ctx);
        if (!channelSearchHandled) {
          const channelLabelHandled = await channelEditLabelTextHandler(ctx);
          if (!channelLabelHandled) {
            const botSettingsCardAddHandled = await botSettingsCardAddTextHandler(ctx);
            if (!botSettingsCardAddHandled) {
              const botSettingsPvSetHandled = await botSettingsPvSetTextHandler(ctx);
              if (!botSettingsPvSetHandled) {
                const botSettingsSupportSetHandled = await botSettingsSupportSetTextHandler(ctx);
                if (!botSettingsSupportSetHandled) {
                  const transferHandled = await transferAmountHandler(ctx);
                  if (!transferHandled) {
                    await chargeAmountHandler(ctx);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
});
bot.on('photo', async (ctx) => {
  const handled = await planOrderReceiptHandler(ctx);
  if (handled) return;
  await chargeReceiptHandler(ctx);
});

bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

const app = express();

app.use(express.json());

app.use(bot.webhookCallback('/webhook'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  try {
    await initDatabase();
    const webhookUrl = `${config.WEBHOOK}/webhook`;
    await bot.telegram.setWebhook(webhookUrl);
    console.log(`Webhook set to: ${webhookUrl}`);
    schedulePanelJobs(bot);
    console.log('Bot ready to receive updates via webhook');
  } catch (err) {
    console.error('Failed to initialize:', err);
    process.exit(1);
  }
});

process.once('SIGINT', async () => {
  console.log('\nShutting down...');
  try {
    await bot.telegram.deleteWebhook();
    console.log('Webhook removed');
  } catch (err) {
    console.error('Error removing webhook:', err);
  }
  process.exit(0);
});

process.once('SIGTERM', async () => {
  console.log('\nShutting down...');
  try {
    await bot.telegram.deleteWebhook();
    console.log('Webhook removed');
  } catch (err) {
    console.error('Error removing webhook:', err);
  }
  process.exit(0);
});

