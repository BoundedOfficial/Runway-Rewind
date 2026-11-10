local dental = require 'treatments.dental'
return {
    { id='level-1', title='The Makeover', thumbnail='thumbnail-1', sequence=require 'treatments.level_one', renderer='portrait' },
    { id='level-2', title='The Deep Clean', thumbnail='thumbnail-2', sequence=dental.sequence, renderer='dental' },
}
