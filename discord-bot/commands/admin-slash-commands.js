'use strict';

function buildAdminSlashCommands({ localizeText, optionType, adminPermission }) {

  return [
    {
      name: 'addelo',
      description: localizeText({ fr: 'Ajouter de l’Elo à un joueur', en: 'Add Elo to a player' }),
      dm_permission: false,
      default_member_permissions: adminPermission,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: optionType.User,
          required: true
        },
        {
          name: 'amount',
          description: localizeText({ fr: 'Nombre d’Elo à ajouter', en: 'Elo amount to add' }),
          type: optionType.Integer,
          required: true,
          min_value: 1,
          max_value: 2000
        }
      ]
    },
    {
      name: 'removeelo',
      description: localizeText({ fr: 'Retirer de l’Elo à un joueur', en: 'Remove Elo from a player' }),
      dm_permission: false,
      default_member_permissions: adminPermission,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: optionType.User,
          required: true
        },
        {
          name: 'amount',
          description: localizeText({ fr: 'Nombre d’Elo à retirer', en: 'Elo amount to remove' }),
          type: optionType.Integer,
          required: true,
          min_value: 1,
          max_value: 2000
        }
      ]
    },
    {
      name: 'addpoints',
      description: localizeText({ fr: 'Ajouter des points de tier à un joueur', en: 'Add tier points to a player' }),
      dm_permission: false,
      default_member_permissions: adminPermission,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: optionType.User,
          required: true
        },
        {
          name: 'amount',
          description: localizeText({ fr: 'Nombre de points à ajouter', en: 'Points amount to add' }),
          type: optionType.Integer,
          required: true,
          min_value: 1,
          max_value: 10000
        }
      ]
    },
    {
      name: 'setws',
      description: localizeText({ fr: 'Définir la winstreak d’un joueur', en: 'Set a player win streak' }),
      dm_permission: false,
      default_member_permissions: adminPermission,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: optionType.User,
          required: true
        },
        {
          name: 'value',
          description: localizeText({ fr: 'Valeur de winstreak', en: 'Win streak value' }),
          type: optionType.Integer,
          required: true,
          min_value: 0,
          max_value: 200
        }
      ]
    },
    {
      name: 'setls',
      description: localizeText({ fr: 'Définir la losestreak d’un joueur', en: 'Set a player lose streak' }),
      dm_permission: false,
      default_member_permissions: adminPermission,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: optionType.User,
          required: true
        },
        {
          name: 'value',
          description: localizeText({ fr: 'Valeur de losestreak', en: 'Lose streak value' }),
          type: optionType.Integer,
          required: true,
          min_value: 0,
          max_value: 200
        }
      ]
    },
    {
      name: 'banpl',
      description: localizeText({ fr: 'Empêcher un joueur d’utiliser !join', en: 'Ban a player from !join' }),
      dm_permission: false,
      default_member_permissions: adminPermission,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: optionType.User,
          required: true
        },
        {
          name: 'duration',
          description: localizeText({ fr: 'Durée (ex: 30m, 2h, 1d)', en: 'Duration (e.g. 30m, 2h, 1d)' }),
          type: optionType.String,
          required: true
        }
      ]
    },
    {
      name: 'unbanpl',
      description: localizeText({ fr: 'Lever le ban !join d’un joueur', en: 'Lift a player’s !join ban' }),
      dm_permission: false,
      default_member_permissions: adminPermission,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: optionType.User,
          required: true
        }
      ]
    },
    {
      name: 'cancelmatch',
      description: localizeText({ fr: 'Annuler un match PL en cours', en: 'Cancel a running PL match' }),
      dm_permission: false,
      default_member_permissions: adminPermission,
      options: [
        {
          name: 'match_id',
          description: localizeText({ fr: 'Identifiant du match', en: 'Match ID' }),
          type: optionType.Integer,
          required: true,
          min_value: 1
        }
      ]
    },
    {
      name: 'sync',
      description: localizeText({ fr: 'Synchroniser les rôles de rang PL', en: 'Synchronize PL rank roles' }),
      dm_permission: false,
      default_member_permissions: adminPermission
    },
    {
      name: 'counters',
      description: 'Liste les counters d\'un brawler',
      dm_permission: false,
      options: [
        {
          name: 'brawler',
          description: 'Nom du brawler',
          type: optionType.String,
          required: true
        }
      ]
    },
    {
      name: 'addplayer',
      description: localizeText({ fr: 'Ajouter le rôle joueur PL', en: 'Add PL player role' }),
      dm_permission: false,
      default_member_permissions: adminPermission,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: optionType.User,
          required: true
        }
      ]
    },
    {
      name: 'removeplayer',
      description: localizeText({ fr: 'Retirer le rôle joueur PL', en: 'Remove PL player role' }),
      dm_permission: false,
      default_member_permissions: adminPermission,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: optionType.User,
          required: true
        }
      ]
    },
    {
      name: 'resetelo',
      description: localizeText({ fr: "Réinitialiser l'Elo de tous les joueurs", en: 'Reset every player Elo' }),
      dm_permission: false,
      default_member_permissions: adminPermission
    }
  ];

}

module.exports = { buildAdminSlashCommands };
