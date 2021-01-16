import { Client } from '../models/client.ts'
import { Guild } from '../structures/guild.ts'
import { Role } from '../structures/role.ts'
import { GUILD, GUILDS, GUILD_PREVIEW } from '../types/endpoint.ts'
import {
  GuildChannels,
  GuildPayload,
  MemberPayload,
  GuildCreateRolePayload,
  GuildCreatePayload,
  Verification,
  GuildCreateChannelOptions,
  GuildCreateChannelPayload,
  GuildPreview,
  GuildPreviewPayload,
  GuildModifyOptions,
  GuildModifyPayload
} from '../types/guild.ts'
import { BaseManager } from './base.ts'
import { MembersManager } from './members.ts'
import { fetchAuto } from '../../deps.ts'
import { Emoji } from '../structures/emoji.ts'

export interface GuildCreateOptions {
  name: string
  region?: string
  icon?: string
  verificationLevel?: Verification
  roles?: Array<Role | GuildCreateRolePayload>
  channels?: Array<GuildChannels | GuildCreateChannelOptions>
  afkChannelID?: string
  afkTimeout?: number
  systemChannelID?: string
}

export class GuildManager extends BaseManager<GuildPayload, Guild> {
  constructor(client: Client) {
    super(client, 'guilds', Guild)
  }

  async fetch(id: string): Promise<Guild> {
    return await new Promise((resolve, reject) => {
      this.client.rest
        .get(GUILD(id))
        .then(async (data: any) => {
          this.set(id, data)

          const guild = new Guild(this.client, data)

          if ((data as GuildPayload).members !== undefined) {
            const members = new MembersManager(this.client, guild)
            await members.fromPayload(
              (data as GuildPayload).members as MemberPayload[]
            )
            guild.members = members
          }

          resolve(guild)
        })
        .catch((e) => reject(e))
    })
  }

  async create(options: GuildCreateOptions): Promise<Guild> {
    if (options.icon !== undefined && !options.icon.startsWith('data:')) {
      options.icon = await fetchAuto(options.icon)
    }

    const body: GuildCreatePayload = {
      name: options.name,
      region: options.region,
      icon: options.icon,
      verification_level: options.verificationLevel,
      roles:
        options.roles !== undefined
          ? options.roles.map((obj) => {
              let result: GuildCreateRolePayload
              if (obj instanceof Role) {
                result = {
                  id: obj.id,
                  name: obj.name,
                  color: obj.color,
                  hoist: obj.hoist,
                  position: obj.position,
                  permissions: obj.permissions.bitfield.toString(),
                  managed: obj.managed,
                  mentionable: obj.mentionable
                }
              } else {
                result = obj
              }

              return result
            })
          : undefined,
      channels:
        options.channels !== undefined
          ? options.channels.map(
              (obj): GuildCreateChannelPayload => ({
                id: obj.id,
                name: obj.name,
                type: obj.type,
                parent_id: obj.parentID
              })
            )
          : undefined,
      afk_channel_id: options.afkChannelID,
      afk_timeout: options.afkTimeout,
      system_channel_id: options.systemChannelID
    }

    const result: GuildPayload = await this.client.rest.post(GUILDS(), body)
    const guild = new Guild(this.client, result)

    return guild
  }

  async preview(guildID: string): Promise<GuildPreview> {
    const resp: GuildPreviewPayload = await this.client.rest.get(
      GUILD_PREVIEW(guildID)
    )

    const result: GuildPreview = {
      id: resp.id,
      name: resp.name,
      icon: resp.icon,
      splash: resp.splash,
      discoverySplash: resp.discovery_splash,
      emojis: resp.emojis.map((emoji) => new Emoji(this.client, emoji)),
      features: resp.features,
      approximateMemberCount: resp.approximate_member_count,
      approximatePresenceCount: resp.approximate_presence_count,
      description: resp.description
    }

    return result
  }

  async edit(
    guild: Guild | string,
    options: GuildModifyOptions,
    asRaw: false
  ): Promise<Guild>
  async edit(
    guild: Guild | string,
    options: GuildModifyOptions,
    asRaw: true
  ): Promise<GuildPayload>
  async edit(
    guild: Guild | string,
    options: GuildModifyOptions,
    asRaw: boolean = false
  ): Promise<Guild | GuildPayload> {
    if (
      options.icon !== undefined &&
      options.icon !== null &&
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      !options.icon.startsWith('data:')
    ) {
      options.icon = await fetchAuto(options.icon)
    }
    if (
      options.splash !== undefined &&
      options.splash !== null &&
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      !options.splash.startsWith('data:')
    ) {
      options.splash = await fetchAuto(options.splash)
    }
    if (
      options.banner !== undefined &&
      options.banner !== null &&
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      !options.banner.startsWith('data:')
    ) {
      options.banner = await fetchAuto(options.banner)
    }
    if (guild instanceof Guild) {
      guild = guild.id
    }

    const body: GuildModifyPayload = {
      name: options.name,
      region: options.region,
      verification_level: options.verificationLevel,
      default_message_notifications: options.defaultMessageNotifications,
      explicit_content_filter: options.explicitContentFilter,
      afk_channel_id: options.afkChannelID,
      afk_timeout: options.afkTimeout,
      owner_id: options.ownerID,
      icon: options.icon,
      splash: options.splash,
      banner: options.banner,
      system_channel_id: options.systemChannelID,
      rules_channel_id: options.rulesChannelID,
      public_updates_channel_id: options.publicUpdatesChannelID,
      preferred_locale: options.preferredLocale
    }

    const result: GuildPayload = await this.client.rest.patch(
      GUILD(guild),
      body
    )

    if (asRaw) {
      const guild = new Guild(this.client, result)
      return guild
    } else {
      return result
    }
  }

  async delete(guild: Guild | string): Promise<Guild | undefined> {
    if (guild instanceof Guild) {
      guild = guild.id
    }

    const oldGuild = await this.get(guild)

    await this.client.rest.delete(GUILD(guild))
    return oldGuild
  }
}
