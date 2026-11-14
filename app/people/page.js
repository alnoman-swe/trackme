import { prisma } from '../../lib/db.js'
import { config } from '../../lib/logic.js'
import { canEditPeople, getMe } from '../../lib/me.js'
import { savePerson } from '../actions.js'
import Shell, { Icon, PersonFields, Tile } from '../shell.js'

export default async function People() {
  const cfg = config()
  const canEdit = await canEditPeople(await getMe())
  const people = await prisma.person.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] })
  return (
    <Shell active="people">
      <header className="top">
        <div>
          <h1>People</h1>
          <p className="count">
            Anyone without an entry gets a reminder email at {cfg.remindAt}. Admins get the list of who wrote at {cfg.summaryAt}.
            {!canEdit && ' Only admins can change this list.'}
          </p>
        </div>
      </header>
      <fieldset className="people" disabled={!canEdit}>
        {people.map((p) => (
          <form key={p.id} action={savePerson} data-role={p.role} className={`row ${p.active ? '' : 'inactive'}`}>
            <input type="hidden" name="id" value={p.id} />
            <PersonFields person={p} />
            <label><input type="checkbox" name="is_admin" defaultChecked={p.is_admin} /> Admin</label>
            <label title="Untick when someone leaves. Their history is kept."><input type="checkbox" name="active" defaultChecked={p.active} /> On the team</label>
            <button><Icon name="check" />Save</button>
          </form>
        ))}
        <h2 className="group"><Tile icon="plus" tint="var(--sun)" />Add someone</h2>
        <form action={savePerson} className="row">
          <PersonFields />
          <button className="primary"><Icon name="plus" />Add person</button>
        </form>
      </fieldset>
    </Shell>
  )
}
